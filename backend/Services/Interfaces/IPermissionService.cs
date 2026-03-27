using eTPL.API.Models.DTOs;

namespace eTPL.API.Services.Interfaces
{
    public interface IPermissionService
    {
        Task<IEnumerable<PermissionDto>> GetAllAsync();
        Task BulkUpdateAsync(BulkUpdatePermissionRequest request);
        Task<IEnumerable<string>> GetAccessibleMenusAsync(string userLevel);
    }
}
