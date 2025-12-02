import { Course } from "@/context/CourseContext";

export type ContentSnippet = {
    id: string;
    text: string;
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
                    text: sentence,
                    courseId: course.id,
                    courseName: course.title,
                    fileName: file.name,
                    tags: course.tags,
                });
            });
        });
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
