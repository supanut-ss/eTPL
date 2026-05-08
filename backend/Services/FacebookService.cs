using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.Scaffolded;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class FacebookService : IFacebookService
    {
        private string? _pageId;
        private string? _accessToken;
        private readonly string _appId;
        private readonly string _appSecret;
        private readonly HttpClient _httpClient;
        private readonly ScaffoldedDbContext _db;
        private readonly string _apiVersion = "v20.0";

        public FacebookService(IConfiguration configuration, HttpClient httpClient, ScaffoldedDbContext db)
        {
            _appId = configuration["Facebook:AppId"] ?? string.Empty;
            _appSecret = configuration["Facebook:AppSecret"] ?? string.Empty;
            _httpClient = httpClient;
            _db = db;
            
            // Initial load from config, will be overridden by DB if available
            _pageId = configuration["Facebook:PageId"];
            _accessToken = configuration["Facebook:PageAccessToken"];
        }

        private async Task EnsureConfigAsync()
        {
            var dbPageId = await _db.TbmSystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == "Facebook_PageId");
            var dbToken = await _db.TbmSystemSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == "Facebook_PageAccessToken");

            if (dbPageId != null && !string.IsNullOrEmpty(dbPageId.SettingValue))
                _pageId = dbPageId.SettingValue;

            if (dbToken != null && !string.IsNullOrEmpty(dbToken.SettingValue))
                _accessToken = dbToken.SettingValue;
        }

        public async Task<string> PostMessageAsync(string message)
        {
            await EnsureConfigAsync();
            if (string.IsNullOrEmpty(_pageId) || string.IsNullOrEmpty(_accessToken))
            {
                return "Facebook configuration missing (PageId or AccessToken)";
            }

            try
            {
                string url = $"https://graph.facebook.com/{_apiVersion}/{_pageId}/feed";
                
                var payload = new
                {
                    message = message,
                    access_token = _accessToken
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Facebook Post Message Failed: {response.StatusCode} - {result}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Facebook Post Message Error: {ex.Message}");
                return $"Error: {ex.Message}";
            }
        }

        public async Task<string> PostPhotoAsync(string message, string imageUrl)
        {
            await EnsureConfigAsync();
            if (string.IsNullOrEmpty(_pageId) || string.IsNullOrEmpty(_accessToken))
            {
                return "Facebook configuration missing (PageId or AccessToken)";
            }

            try
            {
                string url = $"https://graph.facebook.com/{_apiVersion}/{_pageId}/photos";
                
                var payload = new
                {
                    url = imageUrl,
                    caption = message,
                    access_token = _accessToken
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Facebook Post Photo Failed: {response.StatusCode} - {result}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Facebook Post Photo Error: {ex.Message}");
                return $"Error: {ex.Message}";
            }
        }
        public async Task<string> PostPhotoWithStreamAsync(string message, System.IO.Stream imageStream, string fileName)
        {
            await EnsureConfigAsync();
            if (string.IsNullOrEmpty(_pageId) || string.IsNullOrEmpty(_accessToken))
            {
                return "Facebook configuration missing (PageId or AccessToken)";
            }

            try
            {
                string url = $"https://graph.facebook.com/{_apiVersion}/{_pageId}/photos";

                using var form = new MultipartFormDataContent();
                form.Add(new StringContent(_accessToken), "access_token");
                form.Add(new StringContent(message), "caption");

                var streamContent = new StreamContent(imageStream);
                // Detect mime type based on extension
                string contentType = "image/jpeg";
                if (fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) contentType = "image/png";
                if (fileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)) contentType = "image/webp";
                if (fileName.EndsWith(".gif", StringComparison.OrdinalIgnoreCase)) contentType = "image/gif";
                
                streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
                form.Add(streamContent, "source", fileName);

                var response = await _httpClient.PostAsync(url, form);
                string result = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Facebook Post Photo (Stream) Failed: {response.StatusCode} - {result}");
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Facebook Post Photo (Stream) Error: {ex.Message}");
                return $"Error: {ex.Message}";
            }
        }

        public async Task<string> GetLongLivedTokenAsync(string shortLivedToken)
        {
            if (string.IsNullOrEmpty(_appId) || string.IsNullOrEmpty(_appSecret))
                return "Error: AppId or AppSecret missing in configuration";

            try
            {
                string url = $"https://graph.facebook.com/{_apiVersion}/oauth/access_token" +
                             $"?grant_type=fb_exchange_token" +
                             $"&client_id={_appId}" +
                             $"&client_secret={_appSecret}" +
                             $"&fb_exchange_token={shortLivedToken}";

                var response = await _httpClient.GetAsync(url);
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }

        public async Task<string> GetPageAccessTokenAsync(string longLivedUserToken, string pageId)
        {
            try
            {
                // We can get the page access token directly if we have the page ID and a valid user token with permissions
                string url = $"https://graph.facebook.com/{_apiVersion}/{pageId}?fields=access_token&access_token={longLivedUserToken}";
                
                var response = await _httpClient.GetAsync(url);
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }
    }
}
