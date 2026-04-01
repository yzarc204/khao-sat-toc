import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AdminDashboardData,
  HairOption,
  OptionStat,
  PublicSurveyData,
  ResponseRow,
  SurveySettings,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "survey.sqlite");
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const databaseTarget = isBuildPhase ? ":memory:" : dbPath;

if (!isBuildPhase && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(databaseTarget, { timeout: 5000 });
if (!isBuildPhase) {
  db.pragma("journal_mode = WAL");
}
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

const NO_HAIR_OPTION_NAME = "không có tóc";

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      survey_title TEXT NOT NULL DEFAULT 'Hair Vibe Survey',
      question_title TEXT NOT NULL,
      min_select INTEGER NOT NULL DEFAULT 1,
      max_select INTEGER NOT NULL DEFAULT 3,
      is_open INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hair_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id TEXT UNIQUE NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS response_choices (
      response_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      PRIMARY KEY(response_id, option_id),
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES hair_options(id) ON DELETE CASCADE
    );
  `);

  const surveySettingsColumns = db
    .prepare("PRAGMA table_info(survey_settings)")
    .all() as Array<{ name: string }>;
  const hasSurveyTitle = surveySettingsColumns.some((column) => column.name === "survey_title");

  if (!hasSurveyTitle) {
    db.exec(
      "ALTER TABLE survey_settings ADD COLUMN survey_title TEXT NOT NULL DEFAULT 'Hair Vibe Survey'"
    );
  }

  const settings = db
    .prepare("SELECT id FROM survey_settings WHERE id = 1")
    .get() as { id: number } | undefined;

  if (!settings) {
    db.prepare(
      `INSERT INTO survey_settings (id, survey_title, question_title, min_select, max_select, is_open, updated_at)
       VALUES (1, @surveyTitle, @questionTitle, 3, 5, 1, @updatedAt)`
    ).run({
      surveyTitle: "Hair Vibe Survey",
      questionTitle: "Hãy chọn các kiểu tóc bạn yêu thích nhất",
      updatedAt: new Date().toISOString(),
    });
  }

  const optionCount = db
    .prepare("SELECT COUNT(*) as count FROM hair_options")
    .get() as { count: number };

  if (optionCount.count === 0) {
    const now = new Date().toISOString();
    const defaultOptions = [
      {
        name: "Layer nữ Hàn Quốc",
        imageUrl:
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Wolf cut",
        imageUrl:
          "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Bob ngắn cá tính",
        imageUrl:
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Mullet hiện đại",
        imageUrl:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Tóc dài uốn sóng",
        imageUrl:
          "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Pixie",
        imageUrl:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
      },
    ];

    const stmt = db.prepare(
      `INSERT INTO hair_options (name, image_url, sort_order, created_at)
       VALUES (@name, @imageUrl, @sortOrder, @createdAt)`
    );

    const insertMany = db.transaction(() => {
      defaultOptions.forEach((option, index) => {
        stmt.run({
          ...option,
          sortOrder: index,
          createdAt: now,
        });
      });
    });

    insertMany();
  }
}

migrate();

function mapSettings(row: {
  id: number;
  survey_title: string;
  question_title: string;
  min_select: number;
  max_select: number;
  is_open: number;
  updated_at: string;
}): SurveySettings {
  return {
    id: row.id,
    surveyTitle: row.survey_title,
    questionTitle: row.question_title,
    minSelect: row.min_select,
    maxSelect: row.max_select,
    isOpen: Boolean(row.is_open),
    updatedAt: row.updated_at,
  };
}

function mapOption(row: {
  id: number;
  name: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}): HairOption {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function normalizeOptionName(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

export function getSurveySettings(): SurveySettings {
  const row = db
    .prepare(
      `SELECT id, survey_title, question_title, min_select, max_select, is_open, updated_at
       FROM survey_settings
       WHERE id = 1`
    )
    .get() as
    | {
        id: number;
        survey_title: string;
        question_title: string;
        min_select: number;
        max_select: number;
        is_open: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    throw new Error("Survey settings not initialized");
  }

  return mapSettings(row);
}

export function updateSurveySettings(input: {
  surveyTitle: string;
  questionTitle: string;
  minSelect: number;
  maxSelect: number;
  isOpen: boolean;
}) {
  db.prepare(
    `UPDATE survey_settings
     SET survey_title = @surveyTitle,
         question_title = @questionTitle,
         min_select = @minSelect,
         max_select = @maxSelect,
         is_open = @isOpen,
         updated_at = @updatedAt
     WHERE id = 1`
  ).run({
    ...input,
    isOpen: input.isOpen ? 1 : 0,
    updatedAt: new Date().toISOString(),
  });

  return getSurveySettings();
}

export function getOptions(): HairOption[] {
  const rows = db
    .prepare(
      `SELECT id, name, image_url, sort_order, created_at
       FROM hair_options
       ORDER BY sort_order ASC, id ASC`
    )
    .all() as Array<{
    id: number;
    name: string;
    image_url: string;
    sort_order: number;
    created_at: string;
  }>;

  return rows.map(mapOption);
}

export function createOption(input: { name: string; imageUrl: string }) {
  const lastOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM hair_options")
    .get() as { maxOrder: number };

  const result = db
    .prepare(
      `INSERT INTO hair_options (name, image_url, sort_order, created_at)
       VALUES (@name, @imageUrl, @sortOrder, @createdAt)`
    )
    .run({
      ...input,
      sortOrder: lastOrder.maxOrder + 1,
      createdAt: new Date().toISOString(),
    });

  const row = db
    .prepare(
      `SELECT id, name, image_url, sort_order, created_at
       FROM hair_options WHERE id = ?`
    )
    .get(result.lastInsertRowid) as {
    id: number;
    name: string;
    image_url: string;
    sort_order: number;
    created_at: string;
  };

  return mapOption(row);
}

export function updateOption(
  id: number,
  input: { name: string; imageUrl: string }
): HairOption | null {
  db.prepare(
    `UPDATE hair_options
     SET name = @name, image_url = @imageUrl
     WHERE id = @id`
  ).run({ id, ...input });

  const row = db
    .prepare(
      `SELECT id, name, image_url, sort_order, created_at
       FROM hair_options WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        name: string;
        image_url: string;
        sort_order: number;
        created_at: string;
      }
    | undefined;

  return row ? mapOption(row) : null;
}

export function reorderOptions(optionIdsInOrder: number[]) {
  const update = db.prepare(
    `UPDATE hair_options
     SET sort_order = @sortOrder
     WHERE id = @id`
  );

  const tx = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => {
      update.run({ id, sortOrder: index });
    });
  });

  tx(optionIdsInOrder);
}

export function deleteOption(id: number) {
  db.prepare("DELETE FROM hair_options WHERE id = ?").run(id);
  const options = getOptions();
  reorderOptions(options.map((option) => option.id));
}

export function getPublicSurveyData(): PublicSurveyData {
  return {
    settings: getSurveySettings(),
    options: getOptions(),
  };
}

export function upsertParticipant(input: {
  participantId?: string;
  name?: string;
}): { participantId: string; participantName: string } {
  const now = new Date().toISOString();

  if (input.participantId) {
    const existing = db
      .prepare("SELECT id, name FROM participants WHERE id = ?")
      .get(input.participantId) as { id: string; name: string } | undefined;

    if (existing) {
      db.prepare(`UPDATE participants SET updated_at = @updatedAt WHERE id = @id`).run({
        id: input.participantId,
        updatedAt: now,
      });

      return { participantId: input.participantId, participantName: existing.name };
    }
  }

  const participantId = input.participantId ?? randomUUID();
  const participantName = input.name?.trim() || `DEVICE-${participantId.slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO participants (id, name, created_at, updated_at)
     VALUES (@id, @name, @createdAt, @updatedAt)`
  ).run({
    id: participantId,
    name: participantName,
    createdAt: now,
    updatedAt: now,
  });

  return { participantId, participantName };
}

export function getParticipantWithResponse(participantId: string) {
  const participant = db
    .prepare("SELECT id, name FROM participants WHERE id = ?")
    .get(participantId) as { id: string; name: string } | undefined;

  if (!participant) {
    return null;
  }

  const response = db
    .prepare("SELECT id, submitted_at FROM responses WHERE participant_id = ?")
    .get(participantId) as { id: number; submitted_at: string } | undefined;

  let selectedOptionIds: number[] = [];

  if (response) {
    const rows = db
      .prepare(
        `SELECT option_id FROM response_choices
         WHERE response_id = ?
         ORDER BY option_id ASC`
      )
      .all(response.id) as Array<{ option_id: number }>;

    selectedOptionIds = rows.map((row) => row.option_id);
  }

  return {
    participantId: participant.id,
    participantName: participant.name,
    selectedOptionIds,
    submittedAt: response?.submitted_at ?? null,
  };
}

export function submitSurvey(input: {
  participantId: string;
  selectedOptionIds: number[];
}) {
  const settings = getSurveySettings();
  if (!settings.isOpen) {
    throw new Error("Khảo sát hiện đang tạm đóng.");
  }

  const participant = db
    .prepare("SELECT id FROM participants WHERE id = ?")
    .get(input.participantId) as { id: string } | undefined;

  if (!participant) {
    throw new Error("Không tìm thấy định danh thiết bị.");
  }

  const cleanIds = Array.from(new Set(input.selectedOptionIds)).sort((a, b) => a - b);
  if (cleanIds.length < settings.minSelect || cleanIds.length > settings.maxSelect) {
    throw new Error(
      `Vui lòng chọn từ ${settings.minSelect} đến ${settings.maxSelect} kiểu tóc.`
    );
  }

  const placeholders = cleanIds.map(() => "?").join(",");
  const validRows = cleanIds.length
    ? (db
        .prepare(`SELECT id FROM hair_options WHERE id IN (${placeholders})`)
        .all(...cleanIds) as Array<{ id: number }>)
    : [];

  if (validRows.length !== cleanIds.length) {
    throw new Error("Một số lựa chọn không hợp lệ. Vui lòng tải lại trang.");
  }

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM responses WHERE participant_id = ?")
      .get(input.participantId) as { id: number } | undefined;

    if (existing) {
      throw new Error("Thiết bị này đã hoàn tất khảo sát và không thể gửi lại.");
    }

    const res = db
      .prepare(
        `INSERT INTO responses (participant_id, submitted_at)
         VALUES (?, ?)`
      )
      .run(input.participantId, now);
    const responseId = Number(res.lastInsertRowid);

    const insertChoice = db.prepare(
      `INSERT INTO response_choices (response_id, option_id)
       VALUES (?, ?)`
    );

    cleanIds.forEach((optionId) => {
      insertChoice.run(responseId, optionId);
    });
  });

  tx();

  return getParticipantWithResponse(input.participantId);
}

export function deleteResponse(responseId: number) {
  db.prepare("DELETE FROM responses WHERE id = ?").run(responseId);
}

export function deleteAllResponses() {
  db.prepare("DELETE FROM responses").run();
}

export function reloadNoHairResponses() {
  const options = getOptions();
  const noHairOption = options.find(
    (option) => normalizeOptionName(option.name) === NO_HAIR_OPTION_NAME
  );

  if (!noHairOption) {
    return { updatedResponses: 0, keptResponseId: null as number | null };
  }

  const responsesWithNoHair = getResponses().filter((response) =>
    response.selectedOptionIds.includes(noHairOption.id)
  );

  if (responsesWithNoHair.length <= 1) {
    return {
      updatedResponses: 0,
      keptResponseId: responsesWithNoHair[0]?.id ?? null,
    };
  }

  const alternativeOptionIds = options
    .filter((option) => option.id !== noHairOption.id)
    .map((option) => option.id);

  if (alternativeOptionIds.length === 0) {
    throw new Error("Không có lựa chọn nào khác để thay thế cho 'Không có tóc'.");
  }

  const keepResponseId = responsesWithNoHair[0].id;
  const updateChoice = db.prepare(
    `UPDATE response_choices
     SET option_id = @nextOptionId
     WHERE response_id = @responseId AND option_id = @currentOptionId`
  );
  const deleteChoice = db.prepare(
    `DELETE FROM response_choices
     WHERE response_id = ? AND option_id = ?`
  );

  const tx = db.transaction(() => {
    responsesWithNoHair.slice(1).forEach((response) => {
      const selectedOptionIds = new Set(response.selectedOptionIds);
      const candidates = alternativeOptionIds.filter((optionId) => !selectedOptionIds.has(optionId));

      if (candidates.length === 0) {
        // Fallback when the response already contains every other option.
        deleteChoice.run(response.id, noHairOption.id);
        return;
      }

      const nextOptionId = candidates[Math.floor(Math.random() * candidates.length)];
      updateChoice.run({
        responseId: response.id,
        currentOptionId: noHairOption.id,
        nextOptionId,
      });
    });
  });

  tx();

  return {
    updatedResponses: responsesWithNoHair.length - 1,
    keptResponseId: keepResponseId,
  };
}

function getResponses(): ResponseRow[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.participant_id, p.name AS participant_name, r.submitted_at
       FROM responses r
       INNER JOIN participants p ON p.id = r.participant_id
       ORDER BY r.submitted_at DESC`
    )
    .all() as Array<{
    id: number;
    participant_id: string;
    participant_name: string;
    submitted_at: string;
  }>;

  const responseIds = rows.map((row) => row.id);
  const choicesByResponse = new Map<number, number[]>();

  if (responseIds.length > 0) {
    const placeholders = responseIds.map(() => "?").join(",");
    const choiceRows = db
      .prepare(
        `SELECT response_id, option_id
         FROM response_choices
         WHERE response_id IN (${placeholders})
         ORDER BY response_id, option_id`
      )
      .all(...responseIds) as Array<{ response_id: number; option_id: number }>;

    choiceRows.forEach((row) => {
      const list = choicesByResponse.get(row.response_id) ?? [];
      list.push(row.option_id);
      choicesByResponse.set(row.response_id, list);
    });
  }

  return rows.map((row) => ({
    id: row.id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    selectedOptionIds: choicesByResponse.get(row.id) ?? [],
    submittedAt: row.submitted_at,
  }));
}

function getOptionStats(options: HairOption[]): OptionStat[] {
  const rows = db
    .prepare(
      `SELECT rc.option_id, COUNT(*) AS votes
       FROM response_choices rc
       GROUP BY rc.option_id`
    )
    .all() as Array<{ option_id: number; votes: number }>;

  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
  const voteMap = new Map(rows.map((row) => [row.option_id, row.votes]));

  return options.map((option) => {
    const votes = voteMap.get(option.id) ?? 0;
    return {
      optionId: option.id,
      optionName: option.name,
      imageUrl: option.imageUrl,
      votes,
      ratio: totalVotes > 0 ? Number(((votes / totalVotes) * 100).toFixed(2)) : 0,
    };
  });
}

export function getAdminDashboardData(): AdminDashboardData {
  const settings = getSurveySettings();
  const options = getOptions();
  const responses = getResponses();
  const optionStats = getOptionStats(options);

  const totalSelections = responses.reduce(
    (sum, response) => sum + response.selectedOptionIds.length,
    0
  );

  const mostVoted = optionStats
    .filter((item) => item.votes > 0)
    .sort((a, b) => b.votes - a.votes)[0];

  const totalParticipants = db
    .prepare("SELECT COUNT(*) as count FROM participants")
    .get() as { count: number };

  return {
    settings,
    options,
    responses,
    stats: {
      totalParticipants: totalParticipants.count,
      totalResponses: responses.length,
      averageSelections:
        responses.length > 0 ? Number((totalSelections / responses.length).toFixed(2)) : 0,
      mostVotedOptionName: mostVoted?.optionName ?? null,
    },
    optionStats,
  };
}
