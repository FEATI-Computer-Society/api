import { Client } from '@notionhq/client';

const notion = new Client({
    auth: process.env.VITE_NOTION_API_KEY,
});

export const handler = async (request) => {
    //GET member by ID request
    if (request.httpMethod === 'GET' && request.path.split('/')[4]) {
        const studentId = request.path.split('/')[4];
        // Authenticated
        if (request.headers['api-key'] && request.headers['api-key'] === process.env.VITE_API_KEY) {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });
            const student = data.results.find(
                (student) => student.properties['ID']['unique_id'].number === parseInt(studentId)
            );
            if (!student) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Student not found' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
            const reorderedData = authenticatedSchema(student);
            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // Unauthenticated
        else {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });
            const student = data.results.find(
                (student) => student.properties['ID']['unique_id'].number === parseInt(studentId)
            );
            if (!student) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Student not found' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
            const reorderedData = unauthenticatedSchema(student);
            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    }

    // GET members request
    if (request.httpMethod === 'GET') {
        // Authenticated
        if (request.headers['api-key'] && request.headers['api-key'] === process.env.VITE_API_KEY) {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });
            const reorderedData = data.results.map((student) => authenticatedSchema(student));
            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        }

        // Unauthenticated
        else {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });
            const reorderedData = data.results.map((student) => unauthenticatedSchema(student));
            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        }
    }
};

const authenticatedSchema = (student) => ({
    id: `${student.properties['ID']['unique_id'].prefix}-${student.properties['ID']['unique_id'].number}`,
    firstName: student.properties['First name']['title'][0].plain_text,
    middleInitial: student.properties['Middle name']['rich_text'][0].plain_text,
    lastName: student.properties['Last name']['rich_text'][0].plain_text,
    age: student.properties['Age']['formula'].number,
    role: student.properties['Role']['select'].name,
    dateJoined: student.properties['Date Joined']['date'].start,
});

const unauthenticatedSchema = (student) => ({
    id: `${student.properties['ID']['unique_id'].prefix}-${student.properties['ID']['unique_id'].number}`,
    firstName: student.properties['First name']['title'][0].plain_text,
    lastName: student.properties['Last name']['rich_text'][0].plain_text,
    role: student.properties['Role']['select'].name,
    dateJoined: student.properties['Date Joined']['date'].start,
});
