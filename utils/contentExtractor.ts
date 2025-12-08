import { Course } from "@/context/CourseContext";

export type SnippetType = 'text' | 'fact' | 'qna' | 'true_false' | 'concept' | 'ad';

export type ContentSnippet = {
    id: string;
    type: SnippetType;
    content: string; // Main text, question, or statement
    answer?: string; // For Q&A and True/False
    label?: string; // Optional subtitle or label
    courseId: string;
    courseName: string;
    fileName: string;
    tags: string[];
};

/**
 * Extract sentences from text, splitting by periods or newlines
 */
function extractSentences(text: string): string[] {
    // Split by period followed by space or newline, or just newline
    const sentences = text
        .split(/[.!?]\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter out very short fragments

    return sentences;
}

/**
 * Generate random content snippets from courses
 */
export function generateSnippets(
    courses: Course[],
    count: number,
    filterTags?: string[],
    filterCourseId?: string
): ContentSnippet[] {
    const allSnippets: ContentSnippet[] = [];

    // Filter courses if needed
    let filteredCourses = courses;
    if (filterCourseId) {
        filteredCourses = courses.filter(c => c.id === filterCourseId);
    }

    // Extract snippets from each course
    filteredCourses.forEach(course => {
        // Add AI Snippets if available
        if (course.aiSnippets && course.aiSnippets.length > 0) {
            // Check tags for AI snippets too (using course tags)
            const hasMatchingTag = !filterTags || filterTags.length === 0 ||
                course.tags.some(tag => filterTags.includes(tag));

            if (hasMatchingTag) {
                course.aiSnippets.forEach((snippetStr, idx) => {
                    try {
                        // Try to parse as structured snippet
                        const parsed = JSON.parse(snippetStr);
                        if (parsed && typeof parsed === 'object' && parsed.type && parsed.content) {
                            allSnippets.push({
                                id: `${course.id}-ai-${idx}`,
                                type: parsed.type as SnippetType,
                                content: parsed.content,
                                answer: parsed.answer,
                                label: parsed.label,
                                courseId: course.id,
                                courseName: course.title,
                                fileName: "AI Generated",
                                tags: course.tags,
                            });
                            return;
                        }
                    } catch (e) {
                        // Not JSON, fall through to simple text
                    }

                    // Fallback for legacy or plain string snippets
                    allSnippets.push({
                        id: `${course.id}-ai-${idx}`,
                        type: 'text',
                        content: snippetStr,
                        courseId: course.id,
                        courseName: course.title,
                        fileName: "AI Generated",
                        tags: course.tags,
                    });
                });
            }
        }

        /* 
        // Disable raw text snippets for now, per user request
        course.files.forEach(file => {
            if (!file.parsedText) return;

            // Check if file has any of the filter tags (if filtering by tag)
            const hasMatchingTag = !filterTags || filterTags.length === 0 ||
                course.tags.some(tag => filterTags.includes(tag));

            if (!hasMatchingTag) return;

            const sentences = extractSentences(file.parsedText);

            sentences.forEach((sentence, idx) => {
                allSnippets.push({
                    id: `${course.id}-${file.name}-${idx}`,
                    type: 'text',
                    content: sentence,
                    courseId: course.id,
                    courseName: course.title,
                    fileName: file.name,
                    tags: course.tags,
                });
            });
        });
        */
    });

    // Shuffle and return requested count
    return shuffleArray(allSnippets).slice(0, count);
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
