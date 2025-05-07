import { Client, APIErrorCode } from '@notionhq/client';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

const authenticatedSchema = (project) => ({
    name: project.properties['Project name'].title[0].plain_text,
    startDate: project.properties['Date Created'].date.start,
    status: project.properties['Status'].status.name,
    priority: project.properties['Priority'].select.name,
    summary: project.properties['Summary'].rich_text.plain_text,
});

const unauthenticatedSchema = (project) => ({
    name: project.properties['Project name'].title[0].plain_text,
    status: project.properties['Status'].status.name,
    summary: project.properties['Summary'].rich_text.plain_text,
});

export const handler = async (request) => {
    const method = request.httpMethod;
    const path = request.path.split('/');
    const pathParameter = path[3];
    const apiKey = request.headers['api-key'];

    // GET projects
    if (method === 'GET' && !pathParameter) {
        try {
            const data = await notion.databases.query({
                database_id: process.env.NOTION_DATABASE_ID_PROJECTS,
                filter: {
                    property: 'FCS Public API',
                    checkbox: {
                        equals: true,
                    },
                },
            });

            let reorderedData;

            // Authenticated
            if (apiKey && apiKey === process.env.API_KEY) {
                reorderedData = data.results.map((project) => authenticatedSchema(project));
            }
            // Unauthenticated
            else {
                reorderedData = data.results.map((project) => unauthenticatedSchema(project));
            }

            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        } catch (error) {
            if (error.code === 429) {
                return {
                    statusCode: 503,
                    body: JSON.stringify({ error: 'Service unavailable' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        }
    }
};
