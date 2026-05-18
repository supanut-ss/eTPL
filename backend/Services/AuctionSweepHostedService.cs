using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using eTPL.API.Services.Interfaces;

namespace eTPL.API.Services
{
    public class AuctionSweepHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AuctionSweepHostedService> _logger;
        private readonly TimeSpan _period = TimeSpan.FromHours(1);

        public AuctionSweepHostedService(IServiceProvider serviceProvider, ILogger<AuctionSweepHostedService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Auction Sweep Background Service starting...");

            // Use a PeriodicTimer (available since .NET 6) for robust scheduling
            using var timer = new PeriodicTimer(_period);

            // Execute once immediately on startup
            try
            {
                await RunSweepAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during initial startup background Auction Sweep.");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Wait for the next tick (1 hour) or cancellation
                    if (await timer.WaitForNextTickAsync(stoppingToken))
                    {
                        await RunSweepAsync();
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during scheduled background Auction Sweep.");
                }
            }

            _logger.LogInformation("Auction Sweep Background Service stopping...");
        }

        private async Task RunSweepAsync()
        {
            _logger.LogInformation("Triggering background Auction Sweep...");
            using (var scope = _serviceProvider.CreateScope())
            {
                var auctionService = scope.ServiceProvider.GetRequiredService<IAuctionService>();
                await auctionService.RunLazySweepAsync();
            }
            _logger.LogInformation("Background Auction Sweep executed successfully.");
        }
    }
}
