using System.Threading.Tasks;
using System.Collections.Generic;
using eTPL.API.Models.Scaffolded;

namespace eTPL.API.Services.Interfaces
{
    public interface IAiService
    {
        /// <summary>
        /// Generates a creative image prompt based on champion details.
        /// </summary>
        Task<string> GenerateChampionPromptAsync(string championName, string teamName, string tournament);

        /// <summary>
        /// Generates an image using various AI providers (Leonardo, Gemini, etc).
        /// </summary>
        Task<string> GenerateChampionImageWithFaceAsync(string prompt, List<string> imageUrls, string provider = "Leonardo");

        /// <summary>
        /// Generates a prompt based on type (League, Cup, News).
        /// </summary>
        Task<string> GeneratePromptByTypeAsync(string name, string team, string type);

        /// <summary>
        /// Processes the AI generation workflow for a HOF entry.
        /// </summary>
        Task ProcessHofAiImageAsync(string hofId);
    }
}
