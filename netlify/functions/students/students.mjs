import { Client } from '@notionhq/client';

const notion = new Client({
    auth: process.env.VITE_NOTION_API_KEY,
});

export const handler = async (request) => {
    // Unauthenticated GET members request
    if (request.httpMethod === 'GET') {
        const data = await notion.databases.query({
            database_id: process.env.VITE_NOTION_DATABASE_ID,
            sorts: [
                {
                    property: 'ID',
                    direction: 'ascending',
                },
            ],
        });

        const reorderedData = data.results.map((student) => ({
            id: `${student.properties['ID']['unique_id'].prefix}-${student.properties['ID']['unique_id'].number}`,
            firstName: student.properties['First name']['title'][0].plain_text,
            lastName: student.properties['Last name']['rich_text'][0].plain_text,
            role: student.properties['Role']['select'].name,
            dateJoined: student.properties['Date Joined']['date'].start,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(reorderedData),
            headers: { 'Content-Type': 'application/json' },
        };
    }
};
