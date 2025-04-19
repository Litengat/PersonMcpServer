import { relations } from "drizzle-orm";
import { text, pgTableCreator, uuid, pgEnum } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `person_${name}`);

export const personTable = createTable("persons_table", {
  id: uuid().defaultRandom().primaryKey(),
  sex: text().notNull(),
  firstname: text().notNull(),
  lastname: text().notNull(),
  birthdate: text().notNull(),
  job: text(),
});

export const personRelations = relations(personTable, ({ many }) => ({
  personA: many(relationshipTable, { relationName: "personA" }),
  personB: many(relationshipTable, { relationName: "personB" }),
}));

export const relationshipTypes = [
  "BestFriend",
  "CloseFriend",
  "NormalFriend",
  "Acquaintance",
  "Partner",
  "Crush",
  "Family",
  "Sibling",
  "Parent",
  "romantic Partner",
  "Married",
  "Child",
  "Mentor",
  "Mentee",
  "Colleague",
  "Classmate",
  "Neighbor",
  "Teammate",
  "Rival",
  "ExPartner",
  "Frenemy",
  "Enemy",
  "Stranger",
] as const;

const relationshipTypesEnum = pgEnum(
  "relationship_types_enum",
  relationshipTypes
);

export const relationshipTable = createTable("relationship_table", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  personAId: uuid()
    .notNull()
    .references(() => personTable.id),
  personBId: uuid()
    .notNull()
    .references(() => personTable.id),
  type: relationshipTypesEnum().notNull(),
});

export const relationshipRelations = relations(
  relationshipTable,
  ({ one }) => ({
    personA: one(personTable, {
      fields: [relationshipTable.personAId],
      references: [personTable.id],
      relationName: "personA",
    }),
    personB: one(personTable, {
      fields: [relationshipTable.personBId],
      references: [personTable.id],
      relationName: "personB",
    }),
  })
);

export const relationshipInfoTable = createTable("relationship_info_table", {
  id: uuid().defaultRandom().primaryKey(),
  relationshipId: uuid()
    .notNull()
    .references(() => relationshipTable.id),
  info: text().notNull(),
});

export const relationshipInfoRelations = relations(
  relationshipInfoTable,
  ({ one }) => ({
    relationship: one(relationshipTable, {
      fields: [relationshipInfoTable.relationshipId],
      references: [relationshipTable.id],
    }),
  })
);
