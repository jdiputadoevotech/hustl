/**
 * Gig categories offered on Hustl, each with a short description shown in the
 * marketplace category dropdown. Used by the post/edit forms and browse filter.
 */
export const GIG_CATEGORIES = [
  {
    name: "Web Development",
    description: "Websites, web apps, and bug fixes built by student devs.",
  },
  {
    name: "Graphic Design",
    description: "Logos, posters, and branding for orgs and events.",
  },
  {
    name: "Writing & Translation",
    description: "Essays, articles, resumes, and Bisaya/English translation.",
  },
  {
    name: "Video & Animation",
    description: "Editing, motion graphics, and short promo videos.",
  },
  {
    name: "Tutoring",
    description: "One-on-one help across subjects, exams, and thesis support.",
  },
  {
    name: "Photography",
    description: "Event coverage, portraits, and product shots on campus.",
  },
  {
    name: "Digital Marketing",
    description: "Social media management, content, and page growth.",
  },
  {
    name: "Other",
    description: "Anything else a fellow Carolinian can help you with.",
  },
] as const;

export type GigCategoryName = (typeof GIG_CATEGORIES)[number]["name"];
