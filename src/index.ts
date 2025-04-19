import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import {
  personTable,
  relationshipInfoTable,
  relationshipTable,
  relationshipTypes,
} from "./db/schema.js";
import { and, eq, or } from "drizzle-orm";
import { db } from "./db/index.js";
import { uuid } from "drizzle-orm/gel-core";
import { text } from "stream/consumers";

// Create server instance
const server = new McpServer({
  name: "person",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "get-person",
  "Get person details and overall information",
  {
    firstname: z.string().describe("the person's first name"),
    lastname: z.string().describe("the person's last name"),
  },
  async ({ firstname, lastname }: { firstname: string; lastname: string }) => {
    const person = (
      await db
        .select()
        .from(personTable)
        .where(
          and(
            eq(personTable.firstname, firstname),
            eq(personTable.lastname, lastname)
          )
        )
    )[0];
    if (!person) {
      return {
        content: [
          {
            type: "text",
            text: `Person ${firstname} ${lastname} not found.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Person ${firstname} ${lastname} has the ${person.id} is born on ${person.birthdate} and works as ${person.job}.`,
        },
      ],
    };
  }
);
server.tool(
  "get-person-by-id",
  "Get person details and overall information by the id",
  {
    uuid: z.string().uuid().describe("the person's uuid"),
  },
  async ({ uuid }) => {
    const person = (
      await db.select().from(personTable).where(eq(personTable.id, uuid))
    )[0];
    if (!person) {
      return {
        content: [
          {
            type: "text",
            text: `Person ${uuid} not found.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Person ${person.firstname} ${person.lastname} has the ${person.id} is born on ${person.birthdate} and works as ${person.job}.`,
        },
      ],
    };
  }
);
server.tool(
  "get-relationship",
  "Gets the relationship between two people",
  {
    personA: z.string().uuid().describe("the first person's uuid"),
    personB: z.string().uuid().describe("the second person's uuid"),
  },
  async ({ personA, personB }) => {
    const relationship = (
      await db
        .select()
        .from(relationshipTable)
        .where(
          and(
            eq(relationshipTable.personAId, personA),
            eq(relationshipTable.personBId, personB)
          )
        )
    )[0];

    const infos = await db
      .select()
      .from(relationshipInfoTable)
      .where(eq(relationshipInfoTable.id, relationship.id));

    return {
      content: [
        {
          type: "text",
          text: `Relationship between ${personA} and ${personB} has the id ${
            relationship.id
          } is of type ${
            relationship.type
          }, there are some additional information: ${infos
            .map((info) => info.info)
            .join(", ")}`,
        },
      ],
    };
  }
);

server.tool(
  "create-person",
  "Create a new person",
  {
    firstname: z.string().describe("the person's first name"),
    lastname: z.string().describe("the person's last name"),
    birthdate: z.string().describe("the person's birthdate"),
    job: z.string().optional().describe("the person's job"),
    sex: z.enum(["w", "m", "d"]).describe("the person's sex"),
  },
  async ({ firstname, lastname, birthdate, job, sex }) => {
    const person = await db
      .insert(personTable)
      .values({
        firstname,
        lastname,
        birthdate,
        job,
        sex,
      })
      .returning();
    person[0].id;
    return {
      content: [
        {
          type: "text",
          text: `Person ${firstname} ${lastname} created with id ${person[0].id}`,
        },
      ],
    };
  }
);
server.tool(
  "create-relationship",
  "Create a new relationship between to persons",
  {
    personAId: z.string().describe("the first person's id"),
    personBId: z.string().describe("the second person's id"),
    type: z.enum(relationshipTypes).describe("the type of relationship"),
  },
  async ({ personAId, personBId, type }) => {
    const relationship = await db
      .insert(relationshipTable)
      .values({
        personAId,
        personBId,
        type,
      })
      .returning();
    return {
      content: [
        {
          type: "text",
          text: `Relationship between ${personAId} and ${personBId} created with id ${relationship[0].id}`,
        },
      ],
    };
  }
);
server.tool(
  "add-information-relationship",
  "Adds inforamtion to an existing relationship",
  {
    relationshipId: z.string().uuid().describe("the relationships uuid"),
    info: z
      .string()
      .describe("the information that is added to the relationship"),
  },
  async ({ relationshipId, info }) => {
    await db.insert(relationshipInfoTable).values({
      relationshipId,
      info,
    });
    return {
      content: [
        {
          type: "text",
          text: `Information ${info} added to relationship ${relationshipId}`,
        },
      ],
    };
  }
);
server.tool(
  "get-information-relationship",
  "gets the information of a relationship",
  {
    uuid: z.string().uuid().describe("The uuid of the relationship"),
  },
  async ({ uuid }) => {
    const info = await db
      .select()
      .from(relationshipInfoTable)
      .where(eq(relationshipInfoTable.relationshipId, uuid));
    return {
      content: [
        {
          type: "text",
          text: `${info.map((info) => info.info).join(",")}`,
        },
      ],
    };
  }
);
server.tool("get-all-persons", "Get all persons", {}, async () => {
  const persons = await db.select().from(personTable);
  return {
    content: [
      {
        type: "text",
        text: `Persons: ${persons
          .map((person) => `${person.firstname} ${person.lastname}`)
          .join(", ")}`,
      },
    ],
  };
});
server.tool(
  "get-relationships",
  "Get all relationships of a person",
  {
    personId: z
      .string()
      .uuid()
      .describe("The uuid of the persons, with the relationships"),
  },
  async ({ personId }) => {
    const relations = await db
      .select()
      .from(relationshipTable)
      .where(
        or(
          eq(relationshipTable.personAId, personId),
          eq(relationshipTable.personBId, personId)
        )
      );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(relations),
        },
      ],
    };
  }
);

// server.tool(
//   "random-number",
//   "Get a random number",
//   {
//     max: z.number().describe("the maximum number"),
//     min: z.number().describe("the minimum number"),
//   },
//   async ({ max, min }) => {
//     const random = Math.floor(Math.random() * (max - min + 1)) + min;
//     return {
//       content: [
//         {
//           type: "text",
//           text: `the Random number ${random}`,
//         },
//       ],
//     };
//   }
// );

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(" MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
