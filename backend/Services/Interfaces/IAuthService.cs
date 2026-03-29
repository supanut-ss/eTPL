using eTPL.API.Models.DTOs;

namespace eTPL.API.Services.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
        Task<LoginResponse?> LineLoginAsync(LineLoginRequest request);
    }
}
