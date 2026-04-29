using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using eTPL.API.Services.Interfaces;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.Scaffolded;
using Microsoft.EntityFrameworkCore;

namespace eTPL.API.Services
{
    public class AiService : IAiService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiService> _logger;
        private readonly IWebHostEnvironment _env;
        private readonly ScaffoldedDbContext _db;
        private readonly HttpClient _httpClient;

        public AiService(
            IConfiguration configuration,
            ILogger<AiService> logger,
            IWebHostEnvironment env,
            ScaffoldedDbContext db,
            HttpClient httpClient)
        {
            _configuration = configuration;
            _logger = logger;
            _env = env;
            _db = db;
            _httpClient = httpClient;
        }

        public async Task<string> GenerateChampionPromptAsync(string championName, string teamName, string tournament)
        {
            var apiKey = _configuration["AiSettings:GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("Gemini API Key is missing.");
                return $"A cinematic portrait of football champion {championName} from team {teamName} winning {tournament}, 8k, hyper-realistic.";
            }

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";
                
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = $"You are an expert AI prompt engineer. Create a highly creative, unique, and dynamic image generation prompt for a football esports champion. " +
                                             $"The champion's name is {championName} and they manage the team '{teamName}'. They just won the '{tournament}'. " +
                                             $"Incorporate elements, colors, or atmospheric vibes related to the team '{teamName}' to make it special. " +
                                             $"Ensure the prompt is distinct, highly cinematic, photorealistic, and in 8K resolution. " +
                                             $"Output ONLY the English prompt text without any preamble or quotes." }
                            }
                        }
                    }
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonResponse);
                var prompt = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                return prompt?.Trim() ?? "A cinematic football champion portrait.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating prompt from Gemini");
                return $"A cinematic portrait of football champion {championName} from team {teamName} winning {tournament}, 8k, hyper-realistic.";
            }
        }

        public async Task<string> GenerateChampionImageWithFaceAsync(string prompt, string faceImageUrl)
        {
            var apiKey = _configuration["AiSettings:LeonardoApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("Leonardo API Key is missing.");
                return string.Empty;
            }

            try
            {
                // Leonardo.ai API for image generation with Character Reference
                // Note: This is a simplified version based on Leonardo's API structure
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                
                var requestBody = new
                {
                    prompt = prompt,
                    modelId = "6bef9f1b-29cb-40c7-99d6-5756d7433452", // Default to Leonardo Vision XL or similar
                    width = 768,
                    height = 1024,
                    num_images = 1,
                    imagePrompts = new[] { faceImageUrl }, // In Leonardo API, this is used for Image Prompt / Character Reference
                    // Character Reference specific settings would go here if using their specific v2 API
                };

                var response = await _httpClient.PostAsJsonAsync("https://cloud.leonardo.ai/api/rest/v1/generations", requestBody);
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonResponse);
                var generationId = doc.RootElement.GetProperty("sdGenerationJob").GetProperty("generationId").GetString();

                // Polling for the image (Simplified for this example - in production, use a more robust polling or webhook)
                string imageUrl = null;
                for (int i = 0; i < 10; i++)
                {
                    await Task.Delay(5000); // Wait 5 seconds
                    var statusResponse = await _httpClient.GetAsync($"https://cloud.leonardo.ai/api/rest/v1/generations/{generationId}");
                    if (statusResponse.IsSuccessStatusCode)
                    {
                        var statusJson = await statusResponse.Content.ReadAsStringAsync();
                        using var statusDoc = JsonDocument.Parse(statusJson);
                        var images = statusDoc.RootElement.GetProperty("generations_by_pk").GetProperty("generated_images");
                        if (images.GetArrayLength() > 0)
                        {
                            imageUrl = images[0].GetProperty("url").GetString();
                            break;
                        }
                    }
                }

                return imageUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image from Leonardo.ai");
                return string.Empty;
            }
        }

        public async Task ProcessHofAiImageAsync(string hofId)
        {
            try
            {
                var hof = await _db.TbmHofs.FirstOrDefaultAsync(h => h.HofId == hofId);
                if (hof == null) return;

                // Get User Profile Pic
                var user = await _db.TbmUsers.FirstOrDefaultAsync(u => u.UserId == hof.WinnerName || u.LineName == hof.WinnerName);
                var faceUrl = user?.LinePic;
                var team = hof.WinnerTeam ?? user?.CurrentTeam ?? "Unknown Team";

                // 1. Generate Prompt
                var prompt = await GenerateChampionPromptAsync(hof.WinnerName, team, hof.TournamentTitle);
                hof.AiPrompt = prompt;
                await _db.SaveChangesAsync();

                // 2. Generate Image (only if we have a face URL)
                if (!string.IsNullOrEmpty(faceUrl))
                {
                    var imageUrl = await GenerateChampionImageWithFaceAsync(prompt, faceUrl);
                    if (!string.IsNullOrEmpty(imageUrl))
                    {
                        // 3. Download and Save
                        var fileName = $"hof_{hofId}_{DateTime.Now:yyyyMMddHHmmss}.jpg";
                        var localPath = Path.Combine(_env.WebRootPath, "assets", "images", "hof", fileName);
                        
                        Directory.CreateDirectory(Path.GetDirectoryName(localPath));

                        var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);
                        await File.WriteAllBytesAsync(localPath, imageBytes);

                        hof.AiImageUrl = $"/assets/images/hof/{fileName}";
                        hof.WinnerImage = hof.AiImageUrl; // Overwrite standard winner image with AI one
                        await _db.SaveChangesAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing AI image for HOF {hofId}");
            }
        }
    }
}
