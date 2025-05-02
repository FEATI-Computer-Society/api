import { Client, APIErrorCode } from '@notionhq/client';

import { createClient } from 'redis';

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

let cache;

const initializeRedis = async () => {
    if (!cache) {
        cache = createClient({
            username: 'default',
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_SOCKET_HOST,
                port: 15019,
            },
        });

        cache.on('error', (err) => console.error('Redis Client Error', err));
        await cache.connect();
    }
};

const redis_cache_set_options = {
    expiration: {
        type: 'EX',
        value: 10,
    },
    condition: 'NX',
};

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
        database_id: process.env.NOTION_DATABASE_ID,
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

export const handler = async (request) => {
    await initializeRedis();

    const method = request.httpMethod;
    const path = request.path.split('/');
    const endpoint = path[2];
    const pathParameter = path[3];
    const apiKey = request.headers['api-key'];

    // GET members request
    if (method === 'GET' && !pathParameter) {
        try {
            let data;
            try {
                const cachedData = await cache.get('members');
                if (cachedData) {
                    data = JSON.parse(cachedData);
                } else {
                    data = await notion.databases.query({
                        database_id: process.env.NOTION_DATABASE_ID,
                        sorts: [
                            {
                                property: 'ID',
                                direction: 'ascending',
                            },
                        ],
                    });
                    await cache.set('members', JSON.stringify(data), redis_cache_set_options);
                }
            } catch (error) {
                data = await notion.databases.query({
                    database_id: process.env.NOTION_DATABASE_ID,
                    sorts: [
                        {
                            property: 'ID',
                            direction: 'ascending',
                        },
                    ],
                });
            }

            let reorderedData;

            // Authenticated
            if (apiKey && apiKey === process.env.API_KEY) {
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

    // POST add member request
    if (method === 'POST') {
        try {
            if (apiKey && apiKey === process.env.API_KEY) {
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
        } catch (error) {
            return {
                statusCode: 403,
            };
        }
    }

    //GET member by ID request
    if (method === 'GET' && pathParameter) {
        const memberId = pathParameter;
        try {
            let data;
            try {
                const cachedData = await cache.get(`members`);
                if (cachedData) {
                    data = JSON.parse(cachedData);
                } else {
                    data = await notion.databases.query({
                        database_id: process.env.NOTION_DATABASE_ID,
                        sorts: [
                            {
                                property: 'ID',
                                direction: 'ascending',
                            },
                        ],
                    });
                    await cache.set('members', JSON.stringify(data), redis_cache_set_options);
                }
            } catch (error) {
                data = await notion.databases.query({
                    database_id: process.env.NOTION_DATABASE_ID,
                    sorts: [
                        {
                            property: 'ID',
                            direction: 'ascending',
                        },
                    ],
                });
            }

            const member = data.results.find(
                (member) => member.properties['ID']['unique_id'].number === parseInt(memberId)
            );

            if (!member) {
                throw new ReferenceError('Member not found');
            }

            let reorderedData;

            // Authenticated
            if (apiKey && apiKey === process.env.API_KEY) {
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

    // PATCH update member request
    if (method === 'PATCH' && pathParameter) {
        const memberId = pathParameter;
        try {
            if (apiKey === process.env.API_KEY) {
                const data = await notion.databases.query({
                    database_id: process.env.NOTION_DATABASE_ID,
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
                    statusCode: 201,
                    body: JSON.stringify(authenticatedSchema(response)),
                    headers: { 'Content-Type': 'application/json' },
                };
            } else {
                return {
                    statusCode: 403,
                };
            }
        } catch (error) {
            if (error instanceof ReferenceError) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: error.message }),
                    headers: { 'Content-Type': 'application/json' },
                };
            } else if (error.code === APIErrorCode.ValidationError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: error.message }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        }
    }

    // DELETE member request
    if (method === 'DELETE' && pathParameter) {
        const memberId = pathParameter;
        try {
            if (apiKey === process.env.API_KEY) {
                const data = await notion.databases.query({
                    database_id: process.env.NOTION_DATABASE_ID,
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

                const page_id = member.id;

                // Append the new properties of the member
                const response = await notion.pages.update({
                    page_id: page_id,
                    in_trash: true,
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
        } catch (error) {
            if (error.code === APIErrorCode.ValidationError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: error.message }),
                    headers: { 'Content-Type': 'application/json' },
                };
            } else {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Member not found' }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        }
    }
};
