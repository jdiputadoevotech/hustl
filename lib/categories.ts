/**
 * Job categories on Hustl, each with a short description shown in the
 * marketplace category dropdown. Used by the post/edit forms and browse filter.
 */
export const GIG_CATEGORIES = [
  {
    name: "Web Development",
    description: "Hire students to build or fix websites and web apps.",
  },
  {
    name: "Graphic Design",
    description: "Find students for logos, posters, and branding work.",
  },
  {
    name: "Writing & Translation",
    description: "Get help with writing, editing, and Bisaya/English translation.",
  },
  {
    name: "Video & Animation",
    description: "Hire for editing, motion graphics, and promo videos.",
  },
  {
    name: "Tutoring",
    description: "Find student tutors for subjects, exams, and thesis support.",
  },
  {
    name: "Photography",
    description: "Book students for events, portraits, and product shots.",
  },
  {
    name: "Digital Marketing",
    description: "Hire for social media, content, and page growth.",
  },
  {
    name: "Other",
    description: "Any other work a fellow Carolinian can take on.",
  },
] as const;

export type GigCategoryName = (typeof GIG_CATEGORIES)[number]["name"];
