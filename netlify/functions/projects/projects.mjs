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

const projectInputSchema = (project) => ({
    parent: {
        type: 'database_id',
        database_id: process.env.NOTION_DATABASE_ID_PROJECTS,
    },
    icon: {
        type: 'external',
        external: {
            url: 'https://www.notion.so/icons/target_lightgray.svg',
        },
    },
    properties: {
        'FCS Public API': {
            type: 'checkbox',
            checkbox: project.publicAPI ?? false,
        },
        'Project name': {
            type: 'title',
            title: [
                {
                    type: 'text',
                    text: {
                        content: project.name,
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
                    href: null,
                },
            ],
        },
        'Date Created': {
            type: 'date',
            date: {
                start: project.startDate,
            },
        },
        Status: {
            type: 'status',
            status: {
                name: project.status,
            },
        },
        Priority: {
            type: 'select',
            select: {
                name: project.priority,
            },
        },
    },
});

export const handler = async (request) => {
    const method = request.httpMethod;
    const path = request.path.split('/');
    const pathParameter = path[3];
    const apiKey = request.headers['api-key'];

    // GET projects request
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

    // POST add project request
    if (method === 'POST') {
        try {
            if (apiKey && apiKey === process.env.API_KEY) {
                const project = JSON.parse(request.body);

                const response = await notion.pages.create(projectInputSchema(project));

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

    //GET project by ID request
    if (method === 'GET' && pathParameter) {
        const projectId = pathParameter;
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

            const project = data.results.find(
                (project) => project.properties['ID']['unique_id'].number === parseInt(projectId)
            );

            if (!project) {
                throw new ReferenceError('Project not found');
            }

            let reorderedData;

            // Authenticated
            if (apiKey && apiKey === process.env.API_KEY) {
                reorderedData = authenticatedSchema(project);
            }
            // Unauthenticated
            else {
                reorderedData = unauthenticatedSchema(project);
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
            } else if (error instanceof ReferenceError) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: error.message }),
                    headers: { 'Content-Type': 'application/json' },
                };
            }
        }
    }

    // PATCH update project request
    if (method === 'PATCH' && pathParameter) {
        const projectId = pathParameter;
        try {
            if (apiKey === process.env.API_KEY) {
                const data = await notion.databases.query({
                    database_id: process.env.NOTION_DATABASE_ID_PROJECTS,
                    sorts: [
                        {
                            property: 'ID',
                            direction: 'ascending',
                        },
                    ],
                });

                const project = data.results.find(
                    (project) => project.properties['ID']['unique_id'].number === parseInt(projectId)
                );

                if (!project) {
                    throw new ReferenceError('Project not found');
                }

                const page_id = project.id;
                const patch = JSON.parse(request.body);

                const patchProject = (patch) => {
                    const properties = {
                        'FCS Public API': {
                            type: 'checkbox',
                            checkbox: patch.publicAPI ?? false,
                        },
                    };

                    if (patch.name) {
                        properties['Project name'] = {
                            type: 'title',
                            title: [
                                {
                                    type: 'text',
                                    text: {
                                        content: patch.name,
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
                                    href: null,
                                },
                            ],
                        };
                    }

                    if (patch.startDate) {
                        properties['Date Created'] = {
                            date: {
                                start: patch.startDate,
                            },
                        };
                    }

                    if (patch.status) {
                        properties['Status'] = {
                            type: 'status',
                            status: {
                                name: patch.status,
                            },
                        };
                    }

                    if (patch.priority) {
                        properties['Priority'] = {
                            type: 'select',
                            select: {
                                name: patch.priority,
                            },
                        };
                    }

                    return properties;
                };

                // Append the new properties of the member
                const response = await notion.pages.update({
                    page_id: page_id,
                    properties: patchProject(patch),
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
};
