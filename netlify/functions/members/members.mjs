import { Client, APIErrorCode } from '@notionhq/client';

const notion = new Client({
    auth: process.env.VITE_NOTION_API_KEY,
});

const authenticatedSchema = (member) => ({
    id: `${member.properties['ID']['unique_id'].prefix}-${member.properties['ID']['unique_id'].number}`,
    firstName: member.properties['First name']['title'][0].plain_text,
    middleInitial: member.properties['Middle name']['rich_text'][0].plain_text,
    lastName: member.properties['Last name']['rich_text'][0].plain_text,
    age: member.properties['Age']['formula'].number,
    role: member.properties['Role']['select'].name,
    dateJoined: member.properties['Date Joined']['date'].start,
});

const unauthenticatedSchema = (member) => ({
    id: `${member.properties['ID']['unique_id'].prefix}-${member.properties['ID']['unique_id'].number}`,
    firstName: member.properties['First name']['title'][0].plain_text,
    lastName: member.properties['Last name']['rich_text'][0].plain_text,
    role: member.properties['Role']['select'].name,
    dateJoined: member.properties['Date Joined']['date'].start,
});

const memberinputSchema = (member) => ({
    parent: {
        type: 'database_id',
        database_id: process.env.VITE_NOTION_DATABASE_ID,
    },
    properties: {
        'Birth Date': {
            type: 'date',
            date: {
                start: member.birthDate,
                end: null,
                time_zone: null,
            },
        },
        'Date Joined': {
            type: 'date',
            date: {
                start: member.dateJoined,
                end: null,
                time_zone: null,
            },
        },
        'Last name': {
            type: 'rich_text',
            rich_text: [
                {
                    type: 'text',
                    text: {
                        content: member.lastName,
                        link: null,
                    },
                    annotations: {
                        bold: false,
                        italic: false,
                        strikethrough: false,
                        underline: false,
                        code: false,
                        color: 'default',
                    },
                    // plain_text: 'Garcia',
                    href: null,
                },
            ],
        },
        Role: {
            type: 'select',
            select: {
                id: 'AvDz',
                name: member.role,
                color: 'blue',
            },
        },
        'Middle name': {
            // id: 'puAK',
            type: 'rich_text',
            rich_text: [
                {
                    type: 'text',
                    text: {
                        content: member.middleName,
                        link: null,
                    },
                    annotations: {
                        bold: false,
                        italic: false,
                        strikethrough: false,
                        underline: false,
                        code: false,
                        color: 'default',
                    },
                    // plain_text: 'Sencio',
                    href: null,
                },
            ],
        },
        'First name': {
            type: 'title',
            title: [
                {
                    type: 'text',
                    text: {
                        content: member.firstName,
                        link: null,
                    },
                    annotations: {
                        bold: false,
                        italic: false,
                        strikethrough: false,
                        underline: false,
                        code: false,
                        color: 'default',
                    },
                    // plain_text: 'Lawrence',
                    href: null,
                },
            ],
        },
    },
});

const no_of_members = 6;

export const handler = async (request) => {
    const method = request.httpMethod;
    const path = request.path.split('/');
    const endpoint = path[2];
    const pathParameter = path[3];
    const apiKey = request.headers['api-key'];

    // GET members request
    if (method === 'GET' && endpoint === 'members' && !pathParameter) {
        try {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                page_size: no_of_members,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });

            let reorderedData = undefined;

            // Authenticated
            if (apiKey && apiKey === process.env.VITE_API_KEY) {
                reorderedData = data.results.map((member) => authenticatedSchema(member));
            }
            // Unauthenticated
            else {
                reorderedData = data.results.map((member) => unauthenticatedSchema(member));
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

    //GET member by ID request
    if (method === 'GET' && endpoint === 'members' && pathParameter) {
        const memberId = pathParameter;
        try {
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });

            const member = data.results.find(
                (member) => member.properties['ID']['unique_id'].number === parseInt(memberId)
            );

            if (!member) {
                throw new ReferenceError('Member not found');
            }

            let reorderedData = undefined;

            // Authenticated
            if (apiKey && apiKey === process.env.VITE_API_KEY) {
                reorderedData = authenticatedSchema(member);
            }
            // Unauthenticated
            else {
                reorderedData = unauthenticatedSchema(member);
            }

            return {
                statusCode: 200,
                body: JSON.stringify(reorderedData),
                headers: { 'Content-Type': 'application/json' },
            };
        } catch (error) {
            if (error instanceof ReferenceError) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: error.message }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        }
    }

    // POST add member request
    if (method === 'POST') {
        if (apiKey && apiKey === process.env.VITE_API_KEY) {
            const member = JSON.parse(request.body);

            const response = await notion.pages.create(memberinputSchema(member));

            return {
                statusCode: 200,
                body: JSON.stringify(response),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 403,
            };
        }
    }

    // PATCH update member request
    if (method === 'PATCH' && pathParameter) {
        if (apiKey === process.env.VITE_API_KEY) {
            // Retrieve page_id of the member
            const memberId = request.path.split('/')[4];
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });

            const member = data.results.find(
                (member) => member.properties['ID']['unique_id'].number === parseInt(memberId)
            );

            if (!member) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Member not found' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            const page_id = member.id;
            const patch = JSON.parse(request.body);

            const patchMember = (patch) => {
                const properties = {};

                if (patch.birthDate) {
                    properties['Birth Date'] = {
                        date: {
                            start: patch.birthDate,
                        },
                    };
                }

                if (patch.dateJoined) {
                    properties['Date Joined'] = {
                        date: {
                            start: patch.dateJoined,
                        },
                    };
                }

                if (patch.lastName) {
                    properties['Last name'] = {
                        rich_text: [
                            {
                                text: {
                                    content: patch.lastName,
                                },
                            },
                        ],
                    };
                }

                if (patch.role) {
                    properties['Role'] = {
                        select: {
                            name: patch.role,
                        },
                    };
                }

                if (patch.middleName) {
                    properties['Middle name'] = {
                        rich_text: [
                            {
                                text: {
                                    content: patch.middleName,
                                },
                            },
                        ],
                    };
                }

                if (patch.firstName) {
                    properties['First name'] = {
                        title: [
                            {
                                text: {
                                    content: patch.firstName,
                                },
                            },
                        ],
                    };
                }

                return properties;
            };

            // Append the new properties of the member
            const response = await notion.pages.update({
                page_id: page_id,
                properties: patchMember(patch),
            });

            return {
                statusCode: 200,
                body: JSON.stringify(response),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 403,
            };
        }
    }

    // DELETE member request
    if (method === 'DELETE' && pathParameter) {
        if (apiKey === process.env.VITE_API_KEY) {
            // Retrieve page_id of the member
            const memberId = request.path.split('/')[4];
            const data = await notion.databases.query({
                database_id: process.env.VITE_NOTION_DATABASE_ID,
                sorts: [
                    {
                        property: 'ID',
                        direction: 'ascending',
                    },
                ],
            });

            const member = data.results.find(
                (member) => member.properties['ID']['unique_id'].number === parseInt(memberId)
            );

            if (!member) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Member not found' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            const page_id = member.id;

            // Append the new properties of the member
            const response = await notion.pages.update({
                page_id: page_id,
                archived: false,
            });

            return {
                statusCode: 200,
                body: JSON.stringify(response),
                headers: { 'Content-Type': 'application/json' },
            };
        } else {
            return {
                statusCode: 403,
            };
        }
    }
};
