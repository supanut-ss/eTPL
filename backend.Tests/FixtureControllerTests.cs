using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using eTPL.API.Controllers;
using eTPL.API.Data.Scaffolded;
using eTPL.API.Models.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace eTPL.API.Tests
{
    public class FixtureControllerTests
    {
        [Fact]
        public async Task GetPublic_ReturnsCurrentSeasonFixturesWithCardData()
        {
            await using var database = await CreateDatabaseAsync();

            await database.ExecuteAsync(
                "INSERT INTO tbm_current_season (id, platform, season) VALUES ('00000000-0000-0000-0000-000000000001', 'PC', 5)",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('fx-1', 'D1', 1, 'alpha', 2, 1, 'beta', 'YES', 'h1', 'a1', 5, 'Alpha FC', 'Beta FC', 'PC')",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('fx-old', 'D1', 2, 'old1', 0, 0, 'old2', 'YES', 'h2', 'a2', 4, 'Old FC', 'Past FC', 'PC')",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('fx-1', 'D1', 1, 'alpha', 2, 1, 'beta', 'YES', 5, 'PC', 3, 0, 1, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('fx-old', 'D1', 2, 'old1', 0, 0, 'old2', 'YES', 4, 'PC', 9, 9, 9, 9)"
            );

            await using var context = database.CreateContext();
            var controller = new FixtureController(context);

            var result = await controller.GetPublic();

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<object>>(ok.Value);
            Assert.True(response.Success);

            var items = Assert.IsAssignableFrom<IEnumerable<object>>(response.Data);
            var fixture = Assert.Single(items);
            Assert.Equal("fx-1", GetValue<string>(fixture, "FixtureId"));
            Assert.Equal(3, GetValue<int?>(fixture, "HomeYellow"));
            Assert.Equal(1, GetValue<int?>(fixture, "AwayYellow"));
        }

        [Fact]
        public async Task GetH2H_ReturnsMatchingPairHistoryWithCardData()
        {
            await using var database = await CreateDatabaseAsync();

            await database.ExecuteAsync(
                "INSERT INTO v_fixture_all_log (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM, MATCH_DATE, MATCH_DATE_DISPLAY, RESULT_IMAGE) VALUES ('h2h-1', 'D1', 10, 'alice', 3, 2, 'bob', 'YES', 'ha', 'ab', 5, 'Alice FC', 'Bob FC', 'PC', '2026-03-01', '01/03/26', 'W')",
                "INSERT INTO v_fixture_all_log (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM, MATCH_DATE, MATCH_DATE_DISPLAY, RESULT_IMAGE) VALUES ('h2h-2', 'D1', 11, 'bob', 1, 1, 'alice', 'YES', 'hb', 'ba', 5, 'Bob FC', 'Alice FC', 'PC', '2026-03-08', '08/03/26', 'D')",
                "INSERT INTO v_fixture_all_log (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM, MATCH_DATE, MATCH_DATE_DISPLAY, RESULT_IMAGE) VALUES ('other', 'D1', 12, 'alice', 4, 0, 'charlie', 'YES', 'hc', 'cc', 5, 'Alice FC', 'Charlie FC', 'PC', '2026-03-10', '10/03/26', 'W')",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('h2h-1', 'D1', 10, 'alice', 3, 2, 'bob', 'YES', 5, 'PC', 2, 0, 4, 1)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('h2h-2', 'D1', 11, 'bob', 1, 1, 'alice', 'YES', 5, 'PC', 1, 0, 2, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('other', 'D1', 12, 'alice', 4, 0, 'charlie', 'YES', 5, 'PC', 7, 0, 0, 0)"
            );

            await using var context = database.CreateContext();
            var controller = new FixtureController(context);

            var result = await controller.GetH2H("alice", "bob");

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<object>>(ok.Value);
            Assert.True(response.Success);

            var items = Assert.IsAssignableFrom<IEnumerable<object>>(response.Data).ToList();
            Assert.Equal(2, items.Count);
            Assert.Equal("h2h-2", GetValue<string>(items[0], "FixtureId"));
            Assert.Equal(1, GetValue<int?>(items[0], "HomeYellow"));
            Assert.Equal("h2h-1", GetValue<string>(items[1], "FixtureId"));
            Assert.Equal(4, GetValue<int?>(items[1], "AwayYellow"));
        }

        [Fact]
        public async Task GetAll_NonAdminUser_ReturnsOnlyOwnCurrentSeasonFixturesWithCardData()
        {
            await using var database = await CreateDatabaseAsync();

            await database.ExecuteAsync(
                "INSERT INTO tbm_current_season (id, platform, season) VALUES ('00000000-0000-0000-0000-000000000001', 'PC', 5)",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('own-home', 'D1', 1, 'alice', NULL, NULL, 'bob', 'YES', 'ha', 'ab', 5, 'Alice FC', 'Bob FC', 'PC')",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('own-away', 'D1', 2, 'charlie', 1, 1, 'alice', 'YES', 'hc', 'ca', 5, 'Charlie FC', 'Alice FC', 'PC')",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('other-user', 'D1', 3, 'dave', 2, 0, 'erin', 'YES', 'hd', 'de', 5, 'Dave FC', 'Erin FC', 'PC')",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('own-home', 'D1', 1, 'alice', NULL, NULL, 'bob', 'YES', 5, 'PC', 2, 0, 1, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('own-away', 'D1', 2, 'charlie', 1, 1, 'alice', 'YES', 5, 'PC', 3, 0, 2, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('other-user', 'D1', 3, 'dave', 2, 0, 'erin', 'YES', 5, 'PC', 9, 0, 9, 0)"
            );

            await using var context = database.CreateContext();
            var controller = CreateController(context, "alice", "player");

            var result = await controller.GetAll(null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<object>>(ok.Value);
            Assert.True(response.Success);

            var items = Assert.IsAssignableFrom<IEnumerable<object>>(response.Data).ToList();
            Assert.Equal(2, items.Count);
            Assert.DoesNotContain(items, item => GetValue<string>(item, "FixtureId") == "other-user");
            Assert.Equal(2, GetValue<int?>(items[0], "HomeYellow"));
            Assert.Equal(2, GetValue<int?>(items[1], "AwayYellow"));
        }

        [Fact]
        public async Task GetAll_Search_FiltersByPlayerAndTeamName()
        {
            await using var database = await CreateDatabaseAsync();

            await database.ExecuteAsync(
                "INSERT INTO tbm_current_season (id, platform, season) VALUES ('00000000-0000-0000-0000-000000000001', 'PC', 5)",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('search-home', 'D1', 1, 'searcher', 2, 0, 'other', 'YES', 'sh', 'so', 5, 'Search FC', 'Other FC', 'PC')",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('search-team', 'D1', 2, 'alpha', 1, 1, 'beta', 'YES', 'sa', 'sb', 5, 'Alpha United', 'search rangers', 'PC')",
                "INSERT INTO v_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, HOME_IMAGE, AWAY_IMAGE, SEASON, HOME_TEAM_NAME, AWAY_TEAM_NAME, PLATFORM) VALUES ('search-miss', 'D1', 3, 'gamma', 0, 3, 'delta', 'YES', 'sg', 'sd', 5, 'Gamma Town', 'Delta City', 'PC')",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('search-home', 'D1', 1, 'searcher', 2, 0, 'other', 'YES', 5, 'PC', 1, 0, 0, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('search-team', 'D1', 2, 'alpha', 1, 1, 'beta', 'YES', 5, 'PC', 2, 0, 1, 0)",
                "INSERT INTO tbm_fixture_all (fixture_id, DIVISION, MATCH, HOME, HOME_SCORE, AWAY_SCORE, AWAY, ACTIVE, SEASON, PLATFORM, home_yellow, home_red, away_yellow, away_red) VALUES ('search-miss', 'D1', 3, 'gamma', 0, 3, 'delta', 'YES', 5, 'PC', 9, 0, 9, 0)"
            );

            await using var context = database.CreateContext();
            var controller = CreateController(context, "admin-user", "admin");

            var result = await controller.GetAll("search");

            var ok = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<object>>(ok.Value);
            Assert.True(response.Success);

            var items = Assert.IsAssignableFrom<IEnumerable<object>>(response.Data).ToList();
            Assert.Equal(2, items.Count);
            Assert.Contains(items, item => GetValue<string>(item, "FixtureId") == "search-home");
            Assert.Contains(items, item => GetValue<string>(item, "FixtureId") == "search-team");
            Assert.DoesNotContain(items, item => GetValue<string>(item, "FixtureId") == "search-miss");
        }

        private static FixtureController CreateController(ScaffoldedDbContext context, string? userId = null, string? role = null)
        {
            var controller = new FixtureController(context);

            if (userId != null || role != null)
            {
                var claims = new List<Claim>();
                if (userId != null)
                    claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
                if (role != null)
                    claims.Add(new Claim(ClaimTypes.Role, role));

                controller.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
                    }
                };
            }

            return controller;
        }

        private static T GetValue<T>(object source, string propertyName)
        {
            var property = source.GetType().GetProperty(propertyName);
            Assert.NotNull(property);
            return (T)property!.GetValue(source)!;
        }

        private static async Task<TestFixtureDatabase> CreateDatabaseAsync()
        {
            var connection = new SqliteConnection("Data Source=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<ScaffoldedDbContext>()
                .UseSqlite(connection)
                .Options;

            var database = new TestFixtureDatabase(connection, options);
            await database.InitializeAsync();
            return database;
        }

        private sealed class TestFixtureDatabase : IAsyncDisposable
        {
            private readonly SqliteConnection _connection;
            private readonly DbContextOptions<ScaffoldedDbContext> _options;

            public TestFixtureDatabase(SqliteConnection connection, DbContextOptions<ScaffoldedDbContext> options)
            {
                _connection = connection;
                _options = options;
            }

            public ScaffoldedDbContext CreateContext() => new(_options);

            public async Task InitializeAsync()
            {
                await ExecuteAsync(
                    "CREATE TABLE tbm_current_season (id TEXT PRIMARY KEY, platform TEXT, season INTEGER)",
                    "CREATE TABLE tbm_fixture_all (fixture_id TEXT PRIMARY KEY, DIVISION TEXT, MATCH INTEGER, HOME TEXT, HOME_SCORE INTEGER NULL, AWAY_SCORE INTEGER NULL, AWAY TEXT, ACTIVE TEXT, SEASON INTEGER NULL, PLATFORM TEXT, home_yellow INTEGER NULL, home_red INTEGER NULL, away_yellow INTEGER NULL, away_red INTEGER NULL)",
                    "CREATE TABLE v_fixture_all (fixture_id TEXT, DIVISION TEXT, MATCH INTEGER, HOME TEXT, HOME_SCORE INTEGER NULL, AWAY_SCORE INTEGER NULL, AWAY TEXT, ACTIVE TEXT, HOME_IMAGE TEXT, AWAY_IMAGE TEXT, SEASON INTEGER NULL, HOME_TEAM_NAME TEXT, AWAY_TEAM_NAME TEXT, PLATFORM TEXT)",
                    "CREATE TABLE v_fixture_all_log (fixture_id TEXT, DIVISION TEXT, MATCH INTEGER, HOME TEXT, HOME_SCORE INTEGER NULL, AWAY_SCORE INTEGER NULL, AWAY TEXT, ACTIVE TEXT, HOME_IMAGE TEXT, AWAY_IMAGE TEXT, SEASON INTEGER NULL, HOME_TEAM_NAME TEXT, AWAY_TEAM_NAME TEXT, PLATFORM TEXT, MATCH_DATE TEXT NULL, MATCH_DATE_DISPLAY TEXT, RESULT_IMAGE TEXT)"
                );
            }

            public async Task ExecuteAsync(params string[] commands)
            {
                foreach (var commandText in commands)
                {
                    await using var command = _connection.CreateCommand();
                    command.CommandText = commandText;
                    await command.ExecuteNonQueryAsync();
                }
            }

            public async ValueTask DisposeAsync()
            {
                await _connection.DisposeAsync();
            }
        }
    }
}
