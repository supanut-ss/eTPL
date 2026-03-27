namespace eTPL.API.Models.DTOs
{
    public class LoginRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserDto User { get; set; } = new();
    }

    public class UserDto
    {
        public string UserId { get; set; } = string.Empty;
        public string UserLevel { get; set; } = string.Empty;
        public string? LineId { get; set; }
        public string? LinePic { get; set; }
        public string? LineName { get; set; }
    }

    public class CreateUserRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string UserLevel { get; set; } = "user";
        public string? LineId { get; set; }
        public string? LinePic { get; set; }
        public string? LineName { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Password { get; set; } // null = ไม่เปลี่ยน password
        public string UserLevel { get; set; } = "user";
        public string? LineId { get; set; }
        public string? LinePic { get; set; }
        public string? LineName { get; set; }
    }

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }

        public static ApiResponse<T> Ok(T data, string message = "Success") =>
            new() { Success = true, Message = message, Data = data };

        public static ApiResponse<T> Fail(string message) =>
            new() { Success = false, Message = message };
    }
}
