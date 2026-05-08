using System.Threading.Tasks;

namespace eTPL.API.Services.Interfaces
{
    public interface IFacebookService
    {
        Task<string> PostMessageAsync(string message);
        Task<string> PostPhotoAsync(string message, string imageUrl);
        Task<string> PostPhotoWithStreamAsync(string message, System.IO.Stream imageStream, string fileName);
        Task<string> GetLongLivedTokenAsync(string shortLivedToken);
        Task<string> GetPageAccessTokenAsync(string longLivedUserToken, string pageId);
    }
}
