using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace eTPL.API.Hubs
{
    public class AuctionHub : Hub
    {
        // Clients connect to this hub. We can just broadcast messages from controller.
        // It's a simple real-time mechanism.
    }
}
