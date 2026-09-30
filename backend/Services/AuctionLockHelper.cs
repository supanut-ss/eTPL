using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace eTPL.API.Services
{
    /// <summary>
    /// Serializes concurrent finalization/refund attempts on the same auction across
    /// requests, background sweeps, and app instances via SQL Server's sp_getapplock
    /// (server-side, not just in-process). Must be called after BeginTransactionAsync()
    /// on the same connection - the lock is held for @LockOwner='Transaction' and
    /// releases automatically on commit or rollback.
    ///
    /// Uses raw ADO.NET (not EF's SqlQueryRaw) because sp_getapplock's return value
    /// comes back as a stored-procedure RETURN code, not a result set - composing a
    /// LINQ query on top of a multi-statement SqlQueryRaw call throws
    /// "FromSql/SqlQuery was called with non-composable SQL".
    /// </summary>
    public static class AuctionLockHelper
    {
        public static async Task AcquireFinalizeLockAsync(DatabaseFacade database, int auctionId)
        {
            var resource = $"auction_finalize_{auctionId}";
            var connection = database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            using var cmd = connection.CreateCommand();
            cmd.Transaction = database.CurrentTransaction?.GetDbTransaction();
            cmd.CommandText = "sp_getapplock";
            cmd.CommandType = CommandType.StoredProcedure;

            void AddParam(string name, object value, ParameterDirection direction = ParameterDirection.Input)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = name;
                p.Value = value;
                p.Direction = direction;
                cmd.Parameters.Add(p);
            }

            AddParam("@Resource", resource);
            AddParam("@LockMode", "Exclusive");
            AddParam("@LockOwner", "Transaction");
            AddParam("@LockTimeout", 15000);

            var returnParam = cmd.CreateParameter();
            returnParam.ParameterName = "@ReturnValue";
            returnParam.DbType = DbType.Int32;
            returnParam.Direction = ParameterDirection.ReturnValue;
            cmd.Parameters.Add(returnParam);

            await cmd.ExecuteNonQueryAsync();

            var result = Convert.ToInt32(returnParam.Value);
            if (result < 0)
            {
                throw new Exception($"ไม่สามารถล็อกการประมวลผล auction #{auctionId} ได้ (กำลังถูกประมวลผลจากที่อื่นพร้อมกัน, code={result})");
            }
        }
    }
}
