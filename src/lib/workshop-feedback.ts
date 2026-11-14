/** N7 (LNH answers 13 Nov 2026): "Workshop Feedback Form.docx". Scale 1 strongly disagree … 5 strongly agree. */
export const WF_GROUPS: { title: string; items: string[] }[] = [
  { title: "Content and facilitation", items: [
    "Objectives and learning goals were clearly defined.",
    "Content was relevant to my professional practice.",
    "Material was current, evidence-based, and accurate.",
    "Content depth was appropriate for the audience level.",
    "Facilitator demonstrated expert command of the subject.",
  ] },
  { title: "Learning methods and engagement", items: [
    "Hands-on activities and handouts were useful.",
    "I acquired useful new knowledge and skills.",
    "I can apply these competencies in my practice.",
    "The session failed to provide actionable insights.",
  ] },
  { title: "Organization and logistics", items: [
    "Proceedings failed to adhere to the schedule.",
    "Venue, seating, and equipment were satisfactory.",
    "Food and refreshments provided met expectations.",
  ] },
];
export const WF_STATEMENTS = WF_GROUPS.flatMap((g) => g.items);
/** Negatively worded statements (agreeing is a bad sign): reversed when combined into the summary scores. */
export const WF_NEGATIVE = [8, 9];
export const WF_SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
export const WF_OVERALL = ["Poor", "Fair", "Good", "Very good", "Excellent"];
export const WF_RECOMMEND = [["YES", "Yes"], ["MAYBE", "Maybe"], ["NO", "No"]] as const;

/** Summary scores for the existing dashboards (content, speaker, relevance, organization; 1-5). */
export function wfSummary(a: number[]) {
  const v = (i: number) => (WF_NEGATIVE.includes(i) ? 6 - a[i] : a[i]);
  const avg = (ix: number[]) => Math.round(ix.reduce((t, i) => t + v(i), 0) / ix.length);
  return { content: avg([0, 1, 2, 3]), speaker: v(4), relevance: avg([1, 6, 7, 8]), organization: avg([9, 10, 11]) };
}
