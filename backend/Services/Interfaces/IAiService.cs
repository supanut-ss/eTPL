using System.Threading.Tasks;
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
        /// Generates an image using Leonardo.ai with Character Reference.
        /// </summary>
        Task<string> GenerateChampionImageWithFaceAsync(string prompt, string faceImageUrl);

        /// <summary>
        /// Processes the AI generation workflow for a HOF entry.
        /// </summary>
        Task ProcessHofAiImageAsync(string hofId);
    }
}
