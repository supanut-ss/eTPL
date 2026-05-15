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
using eTPL.API.Data;
using eTPL.API.Models;
using eTPL.API.Models.Scaffolded;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Net.Http.Json;

namespace eTPL.API.Services
{
    public class AiService : IAiService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiService> _logger;
        private readonly IWebHostEnvironment _env;
        private readonly MsSqlDbContext _db;
        private readonly HttpClient _httpClient;

        public AiService(
            IConfiguration configuration,
            ILogger<AiService> logger,
            IWebHostEnvironment env,
            MsSqlDbContext db,
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

            apiKey = apiKey.Trim();
            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";
                
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
                
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Gemini Flash returned 404. Falling back to gemini-pro-latest.");
                    var fallbackUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key={apiKey}";
                    response = await _httpClient.PostAsJsonAsync(fallbackUrl, requestBody);
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Gemini API Error: {errorBody}");
                    response.EnsureSuccessStatusCode();
                }

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

        public async Task<string> GenerateChampionImageWithFaceAsync(string prompt, List<string> imageUrls, string provider = "Leonardo")
        {
            if (provider == "Gemini")
            {
                return await GenerateImageWithGeminiAsync(prompt, imageUrls);
            }
            if (provider == "Tensor")
            {
                return await GenerateImageWithTensorAsync(prompt, imageUrls);
            }
            if (provider == "OpenAI")
            {
                return await GenerateImageWithOpenAiAsync(prompt, imageUrls);
            }
            
            return await GenerateImageWithLeonardoAsync(prompt, imageUrls);
        }

        private async Task<string> GenerateImageWithLeonardoAsync(string prompt, List<string> imageUrls)
        {
            var apiKey = _configuration["AiSettings:LeonardoApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("Leonardo API Key is missing.");
                return string.Empty;
            }

            try
            {
                string? initImageId = null;
                if (imageUrls != null && imageUrls.Count > 0)
                {
                    initImageId = await UploadImageToLeonardoAsync(imageUrls[0]);
                }

                using var genRequest = new HttpRequestMessage(HttpMethod.Post, "https://cloud.leonardo.ai/api/rest/v1/generations");
                genRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                
                var bodyObj = new Dictionary<string, object>
                {
                    { "prompt", $"A professional high-end photorealistic portrait, {prompt}, neutral expression, slight smile, detailed skin texture, visible pores, catchlight in eyes, eye contact with camera, soft studio lighting, blurred stadium background, shot on DSLR 85mm lens, masterpiece" },
                    { "negative_prompt", "blurry face, distorted face, weird smile, caricature, funny face, deformed eyes, bad anatomy, plastic skin, cartoon, watermark, illustration, oversaturated, painting, drawing, bad lighting, extreme expression, yelling" },
                    { "modelId", "aa77f04e-3eec-4034-9c07-d0f619684628" },
                    { "width", 768 },
                    { "height", 1024 },
                    { "num_images", 1 },
                    { "alchemy", true },
                    { "photoReal", true },
                    { "photoRealVersion", "v2" },
                    { "presetStyle", "PORTRAIT" }
                };

                if (initImageId != null)
                {
                    bodyObj.Add("controlnets", new[]
                    {
                        new
                        {
                            initImageId = initImageId,
                            initImageType = "UPLOADED",
                            preprocessorId = 133,
                            weight = 1.0 
                        },
                        new
                        {
                            initImageId = initImageId,
                            initImageType = "UPLOADED",
                            preprocessorId = 67,
                            weight = 0.5
                        }
                    });
                }

                genRequest.Content = new StringContent(JsonSerializer.Serialize(bodyObj), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(genRequest);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Leonardo API Error: {errorBody}");
                    response.EnsureSuccessStatusCode();
                }

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonResponse);
                var generationId = doc.RootElement.GetProperty("sdGenerationJob").GetProperty("generationId").GetString();

                string? imageUrl = null;
                for (int i = 0; i < 600; i++)
                {
                    await Task.Delay(5000); 
                    using var statusRequest = new HttpRequestMessage(HttpMethod.Get, $"https://cloud.leonardo.ai/api/rest/v1/generations/{generationId}");
                    statusRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                    
                    var statusResponse = await _httpClient.SendAsync(statusRequest);
                    if (statusResponse.IsSuccessStatusCode)
                    {
                        var statusJson = await statusResponse.Content.ReadAsStringAsync();
                        using var statusDoc = JsonDocument.Parse(statusJson);
                        var generation = statusDoc.RootElement.GetProperty("generations_by_pk");
                        var status = generation.GetProperty("status").GetString();
                        
                        if (status == "COMPLETE")
                        {
                            var images = generation.GetProperty("generated_images");
                            if (images.GetArrayLength() > 0)
                            {
                                imageUrl = images[0].GetProperty("url").GetString();
                                break;
                            }
                        }
                        else if (status == "FAILED")
                        {
                            break;
                        }
                    }
                }
                return imageUrl ?? string.Empty;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image from Leonardo.ai");
                return string.Empty;
            }
        }

        private async Task<string> GenerateImageWithGeminiAsync(string prompt, List<string> imageUrls)
        {
            var apiKey = _configuration["AiSettings:GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return string.Empty;

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key={apiKey}";
                var payload = new { prompt = prompt, number_of_images = 1, aspect_ratio = "3:4", safety_filter_level = "BLOCK_ONLY_HIGH", person_generation = "ALLOW_ADULT" };

                using var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    url = $"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:generateImages?key={apiKey}";
                    using var retryRequest = new HttpRequestMessage(HttpMethod.Post, url);
                    retryRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    response = await _httpClient.SendAsync(retryRequest);
                }

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var images = doc.RootElement.GetProperty("images");
                    if (images.GetArrayLength() > 0)
                    {
                        var base64Data = images[0].GetProperty("image").GetProperty("imageBytes").GetString();
                        return $"data:image/png;base64,{base64Data}";
                    }
                }
                return string.Empty;
            }
            catch (Exception ex) { _logger.LogError(ex, "Error generating image from Gemini"); return string.Empty; }
        }

        private async Task<string> GenerateImageWithTensorAsync(string prompt, List<string> imageUrls)
        {
            var apiKey = _configuration["AiSettings:TensorApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return string.Empty;

            try
            {
                var stages = new List<object>
                {
                    new { type = "INPUT_INITIALIZE", inputInitialize = new { seed = -1, count = 1 } },
                    new { type = "DIFFUSION", diffusion = new { width = 1024, height = 1024, prompts = new[] { new { text = prompt } }, negative_prompts = new[] { new { text = "blurry, distorted, bad anatomy, watermark" } }, sd_model = "624024888805214068", steps = 25, cfg_scale = 7, sampler = "DPM++ 2M Karras" } }
                };
                var payload = new { request_id = Guid.NewGuid().ToString(), stages = stages };

                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.tensor.art/v1/jobs");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return string.Empty;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var jobId = doc.RootElement.GetProperty("id").GetString();

                for (int i = 0; i < 60; i++)
                {
                    await Task.Delay(5000);
                    using var statusRequest = new HttpRequestMessage(HttpMethod.Get, $"https://api.tensor.art/v1/jobs/{jobId}");
                    statusRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                    var statusRes = await _httpClient.SendAsync(statusRequest);
                    if (statusRes.IsSuccessStatusCode)
                    {
                        var statusJson = await statusRes.Content.ReadAsStringAsync();
                        using var statusDoc = JsonDocument.Parse(statusJson);
                        var status = statusDoc.RootElement.GetProperty("status").GetString();
                        if (status == "SUCCESS")
                        {
                            return statusDoc.RootElement.GetProperty("success_info").GetProperty("images")[0].GetProperty("url").GetString() ?? string.Empty;
                        }
                        else if (status == "FAILED") break;
                    }
                }
                return string.Empty;
            }
            catch (Exception ex) { _logger.LogError(ex, "Error generating image from Tensor.art"); return string.Empty; }
        }

        private async Task<string> GenerateImageWithOpenAiAsync(string prompt, List<string> imageUrls)
        {
            var apiKey = _configuration["AiSettings:OpenAiApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return string.Empty;

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/images/generations");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                var payload = new { model = "dall-e-3", prompt = prompt, n = 1, size = "1024x1024", quality = "hd" };
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    return doc.RootElement.GetProperty("data")[0].GetProperty("url").GetString() ?? string.Empty;
                }
                return string.Empty;
            }
            catch (Exception ex) { _logger.LogError(ex, "Error generating image from OpenAI"); return string.Empty; }
        }

        public async Task<string> GeneratePromptByTypeAsync(string name, string team, string type)
        {
            var apiKey = _configuration["AiSettings:GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return $"A cinematic football portrait of {name} from {team}, 8k, hyper-realistic.";

            string typeContext = type switch
            {
                "LeagueChampion" => "The player is celebrating a hard-fought eTPL League victory...",
                "CupChampion" => "The player is lifting the prestigious eTPL Cup trophy...",
                "News" => "A high-end professional news feature or transfer announcement...",
                _ => "A world-class football player in an iconic moment for eTPL."
            };

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey.Trim()}";
                var requestBody = new { contents = new[] { new { parts = new[] { new { text = $"Generate a detailed prompt for {name} from {team}. Theme: {typeContext}" } } } } };
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    return doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()?.Trim() ?? "A cinematic football player portrait.";
                }
                return "A cinematic football portrait.";
            }
            catch { return "A cinematic football portrait."; }
        }

        public async Task ProcessHofAiImageAsync(string hofId)
        {
            try
            {
                var hof = await _db.TbmHofs.FirstOrDefaultAsync(h => h.HofId == hofId);
                if (hof == null) return;

                var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == hof.WinnerName || u.LineName == hof.WinnerName);
                var faceUrl = user?.LinePic;
                var team = hof.WinnerTeam ?? user?.CurrentTeam ?? "Unknown Team";

                var prompt = await GenerateChampionPromptAsync(hof.WinnerName ?? "Champion", team, hof.TournamentTitle ?? "Tournament");
                
                if (!string.IsNullOrEmpty(faceUrl))
                {
                    var imageUrl = await GenerateChampionImageWithFaceAsync(prompt, new List<string> { faceUrl });
                    if (!string.IsNullOrEmpty(imageUrl))
                    {
                        var fileName = $"hof_{hofId}_{DateTime.Now:yyyyMMddHHmmss}.jpg";
                        var filePath = Path.Combine(_env.WebRootPath, "assets", "images", "hof", fileName);
                        
                        var directory = Path.GetDirectoryName(filePath);
                        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory)) Directory.CreateDirectory(directory);

                        var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);
                        await File.WriteAllBytesAsync(filePath, imageBytes);
                    }
                }
            }
            catch (Exception ex) { _logger.LogError(ex, $"Error processing AI image for HOF {hofId}"); }
        }

        private async Task<string?> UploadImageToLeonardoAsync(string imageUrl)
        {
            try
            {
                var apiKey = _configuration["AiSettings:LeonardoApiKey"];
                if (string.IsNullOrEmpty(apiKey)) return null;

                using var initRequest = new HttpRequestMessage(HttpMethod.Post, "https://cloud.leonardo.ai/api/rest/v1/init-image");
                initRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
                initRequest.Content = new StringContent(JsonSerializer.Serialize(new { extension = "jpg" }), Encoding.UTF8, "application/json");

                var initResponse = await _httpClient.SendAsync(initRequest);
                if (!initResponse.IsSuccessStatusCode) return null;

                var initJson = await initResponse.Content.ReadAsStringAsync();
                using var initDoc = JsonDocument.Parse(initJson);
                var uploadData = initDoc.RootElement.GetProperty("uploadInitImage");
                var id = uploadData.GetProperty("id").GetString();
                var presignedUrl = uploadData.GetProperty("url").GetString();
                var fieldsStr = uploadData.GetProperty("fields").GetString();

                using var downloadClient = new HttpClient();
                downloadClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0...");
                var imageBytes = await downloadClient.GetByteArrayAsync(imageUrl);

                using var s3Client = new HttpClient();
                using var content = new MultipartFormDataContent();
                using var fieldsDoc = JsonDocument.Parse(fieldsStr!);
                foreach (var field in fieldsDoc.RootElement.EnumerateObject()) content.Add(new StringContent(field.Value.GetString() ?? ""), field.Name);
                var imageContent = new ByteArrayContent(imageBytes);
                imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
                content.Add(imageContent, "file", "image.jpg");

                var uploadResponse = await s3Client.PostAsync(presignedUrl, content);
                return uploadResponse.IsSuccessStatusCode ? id : null;
            }
            catch { return null; }
        }

        public async Task<string> AskGeminiAsync(string question)
        {
            var apiKey = _configuration["AiSettings:GeminiApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return "AI service is currently unavailable.";

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey.Trim()}";
                var requestBody = new { system_instruction = new { parts = new[] { new { text = "คุณคือ 'มิยุจัง'..." } } }, contents = new[] { new { parts = new[] { new { text = question } } } } };
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(jsonResponse);
                    return doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()?.Trim() ?? "I'm not sure.";
                }
                return "Sorry, I'm having trouble.";
            }
            catch { return "Something went wrong."; }
        }
    }
}
