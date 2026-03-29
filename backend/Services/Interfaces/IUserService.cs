using eTPL.API.Models.DTOs;

namespace eTPL.API.Services.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllAsync();
        Task<UserDto?> GetByUserIdAsync(string userId);
        Task<UserDto> CreateAsync(CreateUserRequest request);
        Task<UserDto?> UpdateByUserIdAsync(string userId, UpdateUserRequest request);
        Task<bool> DeleteByUserIdAsync(string userId);
        Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequest request);
    }
}
