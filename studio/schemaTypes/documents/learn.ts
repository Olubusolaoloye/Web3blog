import { defineArrayMember, defineField, defineType } from "sanity";

export const course = defineType({
  name: "course",
  title: "Course",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (r) => r.required() }),
    defineField({ name: "summary", type: "text", rows: 3 }),
    defineField({ name: "level", type: "string", options: { list: ["beginner", "intermediate", "advanced"] } }),
    defineField({
      name: "lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })],
      validation: (r) => r.min(1),
    }),
    defineField({ name: "quiz", type: "reference", to: [{ type: "quiz" }] }),
    defineField({ name: "heroImage", type: "image", fields: [defineField({ name: "alt", type: "string" })] }),
  ],
});

export const lesson = defineType({
  name: "lesson",
  title: "Lesson",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (r) => r.required() }),
    defineField({ name: "summary", type: "text", rows: 2 }),
    defineField({ name: "body", type: "blockContent" }),
    defineField({ name: "durationMinutes", type: "number", validation: (r) => r.min(1).integer() }),
  ],
});

export const quiz = defineType({
  name: "quiz",
  title: "Quiz",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "passMark", title: "Pass mark (%)", type: "number", initialValue: 70, validation: (r) => r.min(0).max(100) }),
    defineField({
      name: "questions",
      type: "array",
      validation: (r) => r.min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "question",
          fields: [
            defineField({ name: "prompt", type: "string", validation: (r) => r.required() }),
            defineField({ name: "options", type: "array", of: [defineArrayMember({ type: "string" })], validation: (r) => r.min(2) }),
            defineField({ name: "correctIndex", type: "number", validation: (r) => r.required().min(0).integer() }),
            defineField({ name: "explanation", type: "text", rows: 2 }),
          ],
        }),
      ],
    }),
  ],
});
