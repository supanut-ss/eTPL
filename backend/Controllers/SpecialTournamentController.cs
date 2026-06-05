using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using eTPL.API.Data;
using eTPL.API.Models;

namespace eTPL.API.Controllers
{
    [Route("api/special-tournament")]
    [ApiController]
    public class SpecialTournamentController : ControllerBase
    {
        private readonly MsSqlDbContext _context;

        public SpecialTournamentController(MsSqlDbContext context)
        {
            _context = context;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // TOURNAMENT CRUD
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>List all tournaments. Public users only see isPublic=true ones.</summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> List()
        {
            var userLevel = User.FindFirstValue(ClaimTypes.Role);
            bool isAdminOrMod = userLevel == "admin" || userLevel == "moderator";

            var query = _context.SpecialTournaments.AsQueryable();
            if (!isAdminOrMod)
                query = query.Where(t => t.IsPublic);

            var list = await query
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id, t.Name, t.Description, t.Format, t.Status,
                    t.IsPublic, t.CreatedAt, t.GroupCount, t.TeamsAdvancePerGroup
                })
                .ToListAsync();

            return Ok(new { data = list });
        }

        /// <summary>Get full tournament detail including participants, groups, and matches.</summary>
        [HttpGet("{id:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(Guid id)
        {
            var userLevel = User.FindFirstValue(ClaimTypes.Role);
            bool isAdminOrMod = userLevel == "admin" || userLevel == "moderator";

            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });
            if (!tournament.IsPublic && !isAdminOrMod)
                return Forbid();

            var participants = await _context.SpecialParticipants
                .Where(p => p.TournamentId == id)
                .OrderBy(p => p.RegistrationOrder)
                .ToListAsync();

            var groups = await _context.SpecialGroups
                .Where(g => g.TournamentId == id)
                .OrderBy(g => g.GroupOrder)
                .ToListAsync();

            var matches = await _context.SpecialMatches
                .Where(m => m.TournamentId == id)
                .OrderBy(m => m.Phase)
                .ThenBy(m => m.Round)
                .ThenBy(m => m.MatchNo)
                .ToListAsync();

            // Build participant lookup
            var participantMap = participants.ToDictionary(p => p.Id);

            var matchDtos = matches.Select(m => new
            {
                m.Id, m.Phase, m.GroupId, m.Round, m.MatchNo,
                m.HomeParticipantId, m.AwayParticipantId,
                homeDisplayName = m.HomeParticipantId.HasValue && participantMap.ContainsKey(m.HomeParticipantId.Value)
                    ? participantMap[m.HomeParticipantId.Value].DisplayName : null,
                homeTeamName = m.HomeParticipantId.HasValue && participantMap.ContainsKey(m.HomeParticipantId.Value)
                    ? participantMap[m.HomeParticipantId.Value].TeamName : null,
                homeLogoUrl = m.HomeParticipantId.HasValue && participantMap.ContainsKey(m.HomeParticipantId.Value)
                    ? participantMap[m.HomeParticipantId.Value].LogoUrl : null,
                awayDisplayName = m.AwayParticipantId.HasValue && participantMap.ContainsKey(m.AwayParticipantId.Value)
                    ? participantMap[m.AwayParticipantId.Value].DisplayName : null,
                awayTeamName = m.AwayParticipantId.HasValue && participantMap.ContainsKey(m.AwayParticipantId.Value)
                    ? participantMap[m.AwayParticipantId.Value].TeamName : null,
                awayLogoUrl = m.AwayParticipantId.HasValue && participantMap.ContainsKey(m.AwayParticipantId.Value)
                    ? participantMap[m.AwayParticipantId.Value].LogoUrl : null,
                m.HomeScore, m.AwayScore, m.IsPlayed, m.IsBye, m.NextMatchId, m.WinnerId
            }).ToList();

            return Ok(new
            {
                data = new
                {
                    tournament = new
                    {
                        tournament.Id, tournament.Name, tournament.Description,
                        tournament.Format, tournament.Status, tournament.IsPublic,
                        tournament.CreatedAt, tournament.GroupCount, tournament.TeamsAdvancePerGroup
                    },
                    participants = participants.Select(p => new
                    {
                        p.Id, p.DisplayName, p.TeamName, p.LogoUrl,
                        p.Seed, p.GroupId, p.IsEliminated, p.RegistrationOrder
                    }),
                    groups = groups.Select(g => new { g.Id, g.GroupName, g.GroupOrder }),
                    matches = matchDtos
                }
            });
        }

        /// <summary>Create a new tournament.</summary>
        [HttpPost]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Create([FromBody] CreateTournamentDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var tournament = new SpecialTournament
            {
                Name = dto.Name,
                Description = dto.Description,
                Format = dto.Format ?? "knockout",
                Status = "draft",
                IsPublic = dto.IsPublic,
                GroupCount = dto.GroupCount,
                TeamsAdvancePerGroup = dto.TeamsAdvancePerGroup,
                CreatedBy = userId
            };
            _context.SpecialTournaments.Add(tournament);
            await _context.SaveChangesAsync();
            return Ok(new { message = "สร้างการแข่งขันสำเร็จ!", data = new { tournament.Id } });
        }

        /// <summary>Update tournament settings.</summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTournamentDto dto)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });

            if (dto.Name != null) tournament.Name = dto.Name;
            if (dto.Description != null) tournament.Description = dto.Description;
            if (dto.Format != null) tournament.Format = dto.Format;
            if (dto.Status != null) tournament.Status = dto.Status;
            if (dto.IsPublic.HasValue) tournament.IsPublic = dto.IsPublic.Value;
            if (dto.GroupCount.HasValue) tournament.GroupCount = dto.GroupCount;
            if (dto.TeamsAdvancePerGroup.HasValue) tournament.TeamsAdvancePerGroup = dto.TeamsAdvancePerGroup;

            _context.SpecialTournaments.Update(tournament);
            await _context.SaveChangesAsync();
            return Ok(new { message = "อัปเดตการแข่งขันสำเร็จ!" });
        }

        /// <summary>Delete a tournament (and all related data via CASCADE).</summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });
            _context.SpecialTournaments.Remove(tournament);
            await _context.SaveChangesAsync();
            return Ok(new { message = "ลบการแข่งขันสำเร็จ!" });
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PARTICIPANTS
        // ─────────────────────────────────────────────────────────────────────────

        [HttpPost("{id:guid}/participants")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> AddParticipant(Guid id, [FromBody] ParticipantDto dto)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });

            var order = await _context.SpecialParticipants
                .Where(p => p.TournamentId == id)
                .CountAsync();

            var participant = new SpecialParticipant
            {
                TournamentId = id,
                DisplayName = dto.DisplayName ?? string.Empty,
                TeamName = dto.TeamName,
                LogoUrl = dto.LogoUrl,
                Seed = dto.Seed,
                RegistrationOrder = order
            };
            _context.SpecialParticipants.Add(participant);
            await _context.SaveChangesAsync();
            return Ok(new { message = "เพิ่มผู้เข้าแข่งขันสำเร็จ!", data = new { participant.Id } });
        }

        [HttpPut("{id:guid}/participants/{pid:guid}")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> UpdateParticipant(Guid id, Guid pid, [FromBody] ParticipantDto dto)
        {
            var participant = await _context.SpecialParticipants
                .FirstOrDefaultAsync(p => p.Id == pid && p.TournamentId == id);
            if (participant == null) return NotFound(new { message = "ไม่พบผู้เข้าแข่งขัน" });

            if (dto.DisplayName != null) participant.DisplayName = dto.DisplayName;
            if (dto.TeamName != null) participant.TeamName = dto.TeamName;
            if (dto.LogoUrl != null) participant.LogoUrl = dto.LogoUrl;
            if (dto.Seed.HasValue) participant.Seed = dto.Seed;

            _context.SpecialParticipants.Update(participant);
            await _context.SaveChangesAsync();
            return Ok(new { message = "อัปเดตผู้เข้าแข่งขันสำเร็จ!" });
        }

        [HttpDelete("{id:guid}/participants/{pid:guid}")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> RemoveParticipant(Guid id, Guid pid)
        {
            var participant = await _context.SpecialParticipants
                .FirstOrDefaultAsync(p => p.Id == pid && p.TournamentId == id);
            if (participant == null) return NotFound(new { message = "ไม่พบผู้เข้าแข่งขัน" });
            _context.SpecialParticipants.Remove(participant);
            await _context.SaveChangesAsync();
            return Ok(new { message = "ลบผู้เข้าแข่งขันสำเร็จ!" });
        }

        // ─────────────────────────────────────────────────────────────────────────
        // BRACKET GENERATION (KNOCKOUT)
        // ─────────────────────────────────────────────────────────────────────────

        [HttpPost("{id:guid}/generate-bracket")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> GenerateBracket(Guid id)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });

            var existing = await _context.SpecialMatches
                .Where(m => m.TournamentId == id && m.Phase == "knockout")
                .CountAsync();
            if (existing > 0)
                return BadRequest(new { message = "มี Bracket อยู่แล้ว กรุณา Reset ก่อน" });

            var participants = await _context.SpecialParticipants
                .Where(p => p.TournamentId == id)
                .OrderBy(p => p.Seed ?? 999)
                .ThenBy(p => p.RegistrationOrder)
                .ToListAsync();

            if (participants.Count < 2)
                return BadRequest(new { message = "ต้องมีผู้เข้าแข่งขันอย่างน้อย 2 คน" });

            await GenerateKnockoutBracket(id, participants);

            tournament.Status = "ongoing";
            _context.SpecialTournaments.Update(tournament);
            await _context.SaveChangesAsync();

            return Ok(new { message = "สร้าง Bracket สำเร็จ!" });
        }

        private async Task GenerateKnockoutBracket(Guid tournamentId, List<SpecialParticipant> participants)
        {
            var rng = new Random();
            int totalSlots = 2;
            while (totalSlots < participants.Count) totalSlots *= 2;
            int byesCount = totalSlots - participants.Count;
            int round1MatchCount = totalSlots / 2;

            var bracket = new Dictionary<int, List<SpecialMatch>>();
            int currentRound = totalSlots;
            while (currentRound >= 2)
            {
                int matchCount = currentRound / 2;
                bracket[currentRound] = new List<SpecialMatch>();
                for (int i = 0; i < matchCount; i++)
                    bracket[currentRound].Add(new SpecialMatch
                    {
                        Id = Guid.NewGuid(),
                        TournamentId = tournamentId,
                        Phase = "knockout",
                        Round = currentRound,
                        MatchNo = i + 1
                    });
                currentRound /= 2;
            }

            // Link NextMatchId
            currentRound = totalSlots;
            while (currentRound > 2)
            {
                var cur = bracket[currentRound];
                var next = bracket[currentRound / 2];
                for (int i = 0; i < cur.Count; i++)
                    cur[i].NextMatchId = next[i / 2].Id;
                currentRound /= 2;
            }

            // Assign participants to round 1
            var round1 = bracket[totalSlots];
            var matchIndices = Enumerable.Range(0, round1MatchCount).OrderBy(_ => rng.Next()).ToList();
            var byeIndices = new HashSet<int>(matchIndices.Take(byesCount));
            int pIdx = 0;
            for (int i = 0; i < round1MatchCount; i++)
            {
                var m = round1[i];
                if (byeIndices.Contains(i))
                {
                    m.HomeParticipantId = participants[pIdx++].Id;
                    m.IsBye = true;
                    m.IsPlayed = true;
                    m.WinnerId = m.HomeParticipantId;
                }
                else
                {
                    m.HomeParticipantId = participants[pIdx++].Id;
                    m.AwayParticipantId = participants[pIdx++].Id;
                }
            }

            foreach (var r in bracket.Keys)
                _context.SpecialMatches.AddRange(bracket[r]);
            await _context.SaveChangesAsync();

            // Propagate byes
            await PropagateKnockoutByes(tournamentId);
        }

        private async Task PropagateKnockoutByes(Guid tournamentId)
        {
            bool changed = true;
            while (changed)
            {
                changed = false;
                var matches = await _context.SpecialMatches
                    .Where(m => m.TournamentId == tournamentId && m.Phase == "knockout")
                    .ToListAsync();
                foreach (var m in matches)
                {
                    if (!m.IsBye || !m.IsPlayed || !m.NextMatchId.HasValue || !m.WinnerId.HasValue) continue;
                    var next = matches.FirstOrDefault(x => x.Id == m.NextMatchId.Value);
                    if (next == null) continue;
                    if (next.HomeParticipantId == m.WinnerId || next.AwayParticipantId == m.WinnerId) continue;

                    if (!next.HomeParticipantId.HasValue)
                        next.HomeParticipantId = m.WinnerId;
                    else if (!next.AwayParticipantId.HasValue)
                        next.AwayParticipantId = m.WinnerId;

                    _context.SpecialMatches.Update(next);
                    changed = true;
                }
                if (changed) await _context.SaveChangesAsync();
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // GROUP STAGE GENERATION
        // ─────────────────────────────────────────────────────────────────────────

        [HttpPost("{id:guid}/generate-groups")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> GenerateGroups(Guid id)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });
            if (tournament.Format != "group_knockout")
                return BadRequest(new { message = "รูปแบบการแข่งขันนี้ไม่ใช่ Group + Knockout" });

            int groupCount = tournament.GroupCount ?? 4;

            var existingGroups = await _context.SpecialGroups.Where(g => g.TournamentId == id).CountAsync();
            if (existingGroups > 0)
                return BadRequest(new { message = "มีกลุ่มอยู่แล้ว กรุณา Reset ก่อน" });

            var participants = await _context.SpecialParticipants
                .Where(p => p.TournamentId == id)
                .OrderBy(p => p.Seed ?? 999)
                .ThenBy(p => p.RegistrationOrder)
                .ToListAsync();

            if (participants.Count < groupCount * 2)
                return BadRequest(new { message = $"ผู้เข้าแข่งขันต้องมีอย่างน้อย {groupCount * 2} คน (กลุ่มละ 2 คนขึ้นไป)" });

            // Create groups
            var groupLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            var groups = new List<SpecialGroup>();
            for (int i = 0; i < groupCount; i++)
            {
                var g = new SpecialGroup
                {
                    TournamentId = id,
                    GroupName = groupLabels[i].ToString(),
                    GroupOrder = i
                };
                groups.Add(g);
                _context.SpecialGroups.Add(g);
            }
            await _context.SaveChangesAsync();

            // Assign participants to groups (snake-draft / round-robin seeding)
            var rng = new Random();
            var shuffled = participants.OrderBy(_ => rng.Next()).ToList();
            for (int i = 0; i < shuffled.Count; i++)
            {
                shuffled[i].GroupId = groups[i % groupCount].Id;
                _context.SpecialParticipants.Update(shuffled[i]);
            }
            await _context.SaveChangesAsync();

            // Generate round-robin matches for each group
            foreach (var group in groups)
            {
                var groupParticipants = participants.Where(p => p.GroupId == group.Id).ToList();
                int matchNo = 1;
                for (int i = 0; i < groupParticipants.Count; i++)
                {
                    for (int j = i + 1; j < groupParticipants.Count; j++)
                    {
                        _context.SpecialMatches.Add(new SpecialMatch
                        {
                            TournamentId = id,
                            Phase = "group",
                            GroupId = group.Id,
                            Round = 1,
                            MatchNo = matchNo++,
                            HomeParticipantId = groupParticipants[i].Id,
                            AwayParticipantId = groupParticipants[j].Id
                        });
                    }
                }
            }
            await _context.SaveChangesAsync();

            tournament.Status = "ongoing";
            _context.SpecialTournaments.Update(tournament);
            await _context.SaveChangesAsync();

            return Ok(new { message = "สร้างกลุ่มการแข่งขันสำเร็จ!" });
        }

        /// <summary>After group stage is complete, advance top teams to knockout.</summary>
        [HttpPost("{id:guid}/advance-from-groups")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> AdvanceFromGroups(Guid id)
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });
            if (tournament.Format != "group_knockout")
                return BadRequest(new { message = "รูปแบบการแข่งขันนี้ไม่ใช่ Group + Knockout" });

            int advanceCount = tournament.TeamsAdvancePerGroup ?? 2;

            var existing = await _context.SpecialMatches
                .Where(m => m.TournamentId == id && m.Phase == "knockout")
                .CountAsync();
            if (existing > 0)
                return BadRequest(new { message = "สร้าง Knockout Bracket ไปแล้ว" });

            var groups = await _context.SpecialGroups
                .Where(g => g.TournamentId == id)
                .OrderBy(g => g.GroupOrder)
                .ToListAsync();

            var allMatches = await _context.SpecialMatches
                .Where(m => m.TournamentId == id && m.Phase == "group")
                .ToListAsync();

            // Check all group matches are played
            var unplayed = allMatches.Where(m => !m.IsPlayed).Count();
            if (unplayed > 0)
                return BadRequest(new { message = $"ยังมีแมตช์กลุ่มที่ยังไม่แข่ง {unplayed} นัด" });

            var participants = await _context.SpecialParticipants
                .Where(p => p.TournamentId == id)
                .ToListAsync();

            // Calculate group standings and pick top teams
            var advancers = new List<SpecialParticipant>();
            foreach (var group in groups)
            {
                var groupMatches = allMatches.Where(m => m.GroupId == group.Id).ToList();
                var groupParticipants = participants.Where(p => p.GroupId == group.Id).ToList();

                var standings = groupParticipants.Select(p =>
                {
                    int w = 0, d = 0, l = 0, gf = 0, ga = 0;
                    foreach (var m in groupMatches)
                    {
                        bool isHome = m.HomeParticipantId == p.Id;
                        bool isAway = m.AwayParticipantId == p.Id;
                        if (!isHome && !isAway) continue;
                        int myScore = isHome ? (m.HomeScore ?? 0) : (m.AwayScore ?? 0);
                        int oppScore = isHome ? (m.AwayScore ?? 0) : (m.HomeScore ?? 0);
                        gf += myScore; ga += oppScore;
                        if (myScore > oppScore) w++;
                        else if (myScore == oppScore) d++;
                        else l++;
                    }
                    return new { Participant = p, W = w, D = d, L = l, Pts = w * 3 + d, GD = gf - ga, GF = gf };
                })
                .OrderByDescending(x => x.Pts)
                .ThenByDescending(x => x.GD)
                .ThenByDescending(x => x.GF)
                .ToList();

                advancers.AddRange(standings.Take(advanceCount).Select(x => x.Participant));
            }

            if (advancers.Count < 2)
                return BadRequest(new { message = "ต้องมีผู้ผ่านรอบอย่างน้อย 2 คน" });

            await GenerateKnockoutBracket(id, advancers);

            return Ok(new { message = $"สร้าง Knockout Bracket สำเร็จ! ({advancers.Count} ทีม)" });
        }

        // ─────────────────────────────────────────────────────────────────────────
        // RESET
        // ─────────────────────────────────────────────────────────────────────────

        [HttpPost("{id:guid}/reset-bracket")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> ResetBracket(Guid id, [FromQuery] string phase = "all")
        {
            var tournament = await _context.SpecialTournaments.FindAsync(id);
            if (tournament == null) return NotFound(new { message = "ไม่พบการแข่งขัน" });

            if (phase == "knockout" || phase == "all")
            {
                var knockoutMatches = await _context.SpecialMatches
                    .Where(m => m.TournamentId == id && m.Phase == "knockout")
                    .ToListAsync();
                _context.SpecialMatches.RemoveRange(knockoutMatches);
            }

            if (phase == "group" || phase == "all")
            {
                var groupMatches = await _context.SpecialMatches
                    .Where(m => m.TournamentId == id && m.Phase == "group")
                    .ToListAsync();
                _context.SpecialMatches.RemoveRange(groupMatches);

                var groups = await _context.SpecialGroups
                    .Where(g => g.TournamentId == id)
                    .ToListAsync();
                _context.SpecialGroups.RemoveRange(groups);

                // Clear group assignment from participants
                var participants = await _context.SpecialParticipants
                    .Where(p => p.TournamentId == id)
                    .ToListAsync();
                participants.ForEach(p => { p.GroupId = null; p.IsEliminated = false; });
                _context.SpecialParticipants.UpdateRange(participants);
            }

            tournament.Status = "registration";
            _context.SpecialTournaments.Update(tournament);
            await _context.SaveChangesAsync();

            return Ok(new { message = "รีเซ็ต Bracket สำเร็จ!" });
        }

        // ─────────────────────────────────────────────────────────────────────────
        // REPORT RESULT
        // ─────────────────────────────────────────────────────────────────────────

        [HttpPost("matches/{matchId:guid}/report")]
        [Authorize(Roles = "admin,moderator")]
        public async Task<IActionResult> ReportResult(Guid matchId, [FromBody] SpecialMatchReportDto dto)
        {
            var match = await _context.SpecialMatches.FindAsync(matchId);
            if (match == null) return NotFound(new { message = "ไม่พบแมตช์" });

            if (match.Phase == "knockout" && dto.HomeScore == dto.AwayScore)
                return BadRequest(new { message = "รอบ Knockout ต้องมีผู้ชนะ (ห้ามเสมอ)" });

            match.HomeScore = dto.HomeScore;
            match.AwayScore = dto.AwayScore;
            match.IsPlayed = true;

            if (match.Phase == "knockout")
            {
                match.WinnerId = dto.HomeScore > dto.AwayScore
                    ? match.HomeParticipantId : match.AwayParticipantId;

                // Auto-advance winner
                if (match.NextMatchId.HasValue)
                {
                    var next = await _context.SpecialMatches.FindAsync(match.NextMatchId.Value);
                    if (next != null)
                    {
                        var oldWinnerId = dto.HomeScore < dto.AwayScore
                            ? match.HomeParticipantId : match.AwayParticipantId;

                        if (next.HomeParticipantId == oldWinnerId)
                            next.HomeParticipantId = match.WinnerId;
                        else if (next.AwayParticipantId == oldWinnerId)
                            next.AwayParticipantId = match.WinnerId;
                        else if (!next.HomeParticipantId.HasValue)
                            next.HomeParticipantId = match.WinnerId;
                        else
                            next.AwayParticipantId = match.WinnerId;

                        _context.SpecialMatches.Update(next);
                    }
                }
            }

            _context.SpecialMatches.Update(match);
            await _context.SaveChangesAsync();

            return Ok(new { message = "บันทึกผลสำเร็จ!" });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DTOs
    // ─────────────────────────────────────────────────────────────────────────────

    public class CreateTournamentDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Format { get; set; }
        public bool IsPublic { get; set; } = false;
        public int? GroupCount { get; set; }
        public int? TeamsAdvancePerGroup { get; set; }
    }

    public class UpdateTournamentDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Format { get; set; }
        public string? Status { get; set; }
        public bool? IsPublic { get; set; }
        public int? GroupCount { get; set; }
        public int? TeamsAdvancePerGroup { get; set; }
    }

    public class ParticipantDto
    {
        public string? DisplayName { get; set; }
        public string? TeamName { get; set; }
        public string? LogoUrl { get; set; }
        public int? Seed { get; set; }
    }

    public class SpecialMatchReportDto
    {
        public int HomeScore { get; set; }
        public int AwayScore { get; set; }
    }
}
