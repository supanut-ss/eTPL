using Xunit;
using eTPL.API.Controllers;
using eTPL.API.Models.Auction;

namespace eTPL.API.Tests
{
    public class PesdbScraperTests
    {
        [Fact]
        public void ParsePlayerFromHtml_NewStructure_OutfieldPlayer_ParsesAllFieldsCorrectly()
        {
            // Sample snippet mimicking new pesdb.net HTML for an outfield player
            string html = @"
<!doctype html>
<html>
<head>
    <link rel='canonical' href='https://pesdb.net/efootball/players/nemanja-matic-40240'>
</head>
<body class='player-page'>
    <div class='player-hero'>
        <div class='player-hero-card'>
            <img src='/assets/img/card/f40240.png' data-player-card-image />
        </div>
        <div class='player-hero-content'>
            <div class='player-title-row'>
                <span class='position player-hero-position' data-current-position><a href='/efootball/players/?pos%5B0%5D=4'>DMF</a></span>
                <div>
                    <h1 id='player-name'>Nemanja Matić</h1>
                </div>
            </div>
            <div class='playing-style-row' aria-label='Attacking Playing Style / Defensive Playing Style'>
                <div><span>Attacking Playing Style</span><strong><a href='/efootball/players/?playing_style%5B0%5D=8'>Anchor Man</a></strong></div>
                <div><span>Defensive Playing Style</span><strong><a href='/efootball/players/?playing_style_2%5B0%5D=8'>Anchor Man</a></strong></div>
            </div>
            <div class='player-club-row'>
                <span><a href='/efootball/players/?nationality_id=303'>Serbia</a></span>
                <span><a href='/efootball/players/?team_id=1919'>Sassuolo NV</a></span>
            </div>
            <div class='player-hero-summary'>
                <div class='hero-rating'><span>OVR</span><strong data-current-overall>74</strong></div>
                <dl>
                    <div><dt>Height</dt><dd>194<span class='hero-unit'>&nbsp;cm</span></dd></div>
                    <div><dt>Weight</dt><dd>85<span class='hero-unit'>&nbsp;kg</span></dd></div>
                    <div><dt>Age</dt><dd>38</dd></div>
                    <div><dt>Stronger Foot</dt><dd><a href='/efootball/players/?foot=1'>Left Foot</a></dd></div>
                </dl>
            </div>
        </div>
    </div>
    <div class='player-info-grid'>
        <dl class='player-detail-list'>
            <div><dt>Player Name</dt><dd>Nemanja Matić</dd></div>
            <div><dt>Overall Rating</dt><dd>74</dd></div>
            <div><dt>Nationality</dt><dd><a href='/efootball/players/?nationality_id=303'>Serbia</a></dd></div>
            <div><dt>Club</dt><dd><a href='/efootball/players/?team_id=1919'>Sassuolo NV</a></dd></div>
            <div><dt>League</dt><dd><a href='/efootball/players/?league%5B0%5D=10'>Italian League</a></dd></div>
            <div><dt>Height</dt><dd>194 cm</dd></div>
            <div><dt>Weight</dt><dd>85 kg</dd></div>
            <div><dt>Age</dt><dd>38</dd></div>
            <div><dt>Stronger Foot</dt><dd><a href='/efootball/players/?foot=1'>Left Foot</a></dd></div>
        </dl>
    </div>
</body>
</html>";

            var player = AdminController.ParsePlayerFromHtml(html, 40240);

            Assert.Equal(40240, player.IdPlayer);
            Assert.Equal("Nemanja Matić", player.PlayerName);
            Assert.Equal(74, player.PlayerOvr);
            Assert.Equal("DMF", player.Position);
            Assert.Equal("Anchor Man", player.PlayingStyle);
            Assert.Equal("Sassuolo NV", player.TeamName);
            Assert.Equal("1919", player.IdTeam);
            Assert.Equal("Italian League", player.League);
            Assert.Equal("Serbia", player.Nationality);
            Assert.Equal("Left Foot", player.Foot);
            Assert.Equal(194, player.Height);
            Assert.Equal(85, player.Weight);
            Assert.Equal(38, player.Age);
        }

        [Fact]
        public void ParsePlayerFromHtml_NewStructure_Goalkeeper_PicksDefensivePlayingStyle()
        {
            // Goalkeeper where Attacking is "Basic" and Defensive is "Attacking GK"
            string html = @"
<!doctype html>
<html>
<body class='player-page'>
    <h1 id='player-name'>Kasper Schmeichel</h1>
    <span class='position player-hero-position' data-current-position><a href='#'>GK</a></span>
    <div class='playing-style-row'>
        <div><span>Attacking Playing Style</span><strong><a href='#'>Basic</a></strong></div>
        <div><span>Defensive Playing Style</span><strong><a href='#'>Attacking GK</a></strong></div>
    </div>
    <div class='hero-rating'><strong data-current-overall>75</strong></div>
    <dl class='player-detail-list'>
        <div><dt>Player Name</dt><dd>Kasper Schmeichel</dd></div>
        <div><dt>Overall Rating</dt><dd>75</dd></div>
        <div><dt>Nationality</dt><dd><a href='#'>Denmark</a></dd></div>
        <div><dt>Club</dt><dd>FREE</dd></div>
        <div><dt>League</dt><dd><a href='#'>Free Agent</a></dd></div>
        <div><dt>Height</dt><dd>189 cm</dd></div>
        <div><dt>Weight</dt><dd>89 kg</dd></div>
        <div><dt>Age</dt><dd>40</dd></div>
        <div><dt>Stronger Foot</dt><dd><a href='#'>Right Foot</a></dd></div>
    </dl>
</body>
</html>";

            var player = AdminController.ParsePlayerFromHtml(html, 9042);

            Assert.Equal(9042, player.IdPlayer);
            Assert.Equal("Kasper Schmeichel", player.PlayerName);
            Assert.Equal(75, player.PlayerOvr);
            Assert.Equal("GK", player.Position);
            Assert.Equal("Attacking GK", player.PlayingStyle); // Picked Defensive style because Attacking was "Basic"
            Assert.Equal("FREE", player.TeamName);
            Assert.Null(player.IdTeam);
            Assert.Equal("Free Agent", player.League);
            Assert.Equal("Denmark", player.Nationality);
            Assert.Equal("Right Foot", player.Foot);
            Assert.Equal(189, player.Height);
            Assert.Equal(89, player.Weight);
            Assert.Equal(40, player.Age);
        }

        [Fact]
        public void ParsePlayerFromHtml_OldStructure_BackwardCompatibility()
        {
            string html = @"
<table>
    <tr><th>Player Name:</th><td><span>Cristiano Ronaldo</span></td></tr>
    <tr><th>Overall Rating:</th><td><b>85</b></td></tr>
    <tr><th>Position:</th><td><span>CF</span></td></tr>
    <tr><th>Team Name:</th><td><span><a href='#'>Al Nassr</a></span></td></tr>
    <tr><th>League:</th><td><span><a href='#'>Saudi Pro League</a></span></td></tr>
    <tr><th>Nationality:</th><td><span><a href='#'>Portugal</a></span></td></tr>
    <tr><th>Playing Style</th><td><span><a href='#'>Goal Poacher</a></span></td></tr>
    <tr><th>Foot:</th><td><span>Right foot</span></td></tr>
    <tr><th>Height (cm):</th><td><span>187</span></td></tr>
    <tr><th>Weight (kg):</th><td><span>83</span></td></tr>
    <tr><th>Age:</th><td><span>39</span></td></tr>
</table>";

            var player = AdminController.ParsePlayerFromHtml(html, 4522);

            Assert.Equal(4522, player.IdPlayer);
            Assert.Equal("Cristiano Ronaldo", player.PlayerName);
            Assert.Equal(85, player.PlayerOvr);
            Assert.Equal("CF", player.Position);
            Assert.Equal("Goal Poacher", player.PlayingStyle);
            Assert.Equal("Al Nassr", player.TeamName);
            Assert.Equal("Saudi Pro League", player.League);
            Assert.Equal("Portugal", player.Nationality);
            Assert.Equal("Right foot", player.Foot);
            Assert.Equal(187, player.Height);
            Assert.Equal(83, player.Weight);
            Assert.Equal(39, player.Age);
        }
    }
}
