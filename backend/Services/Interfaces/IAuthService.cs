using eTPL.API.Models.DTOs;

namespace eTPL.API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
        Task<LoginResponse?> LineLoginAsync(LineLoginRequest request);
        Task<LineAuthResponse?> LineAuthAsync(LineLoginRequest request);
        Task<IEnumerable<LineAvailableUserDto>> GetLineAvailableUsersAsync();
        Task<LoginResponse?> BindLineAccountAsync(LineBindRequest request);
        string GetLineAuthorizeUrl(string redirectUri, string state);
    }
}
