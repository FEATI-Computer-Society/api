import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

export const handler = async (request) => {
    // Full information GET student by id method
    const pathParts = request.path.split('/').filter(Boolean);
    const studentId = pathParts.length > 3 ? pathParts[3] : null;
    if (studentId && request.httpMethod === 'GET' && request.headers['api-key'] === process.env.VITE_API_KEY) {
        const { data, error } = await supabase.from('students').select('*').eq('id', studentId);

        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

        // Reorder fields in the response
        const reorderedData = data.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            middleInitial: student.middleInitial,
            lastName: student.lastName,
            age: student.age,
            role: student.role,
            dateJoined: student.dateJoined,
            birthDate: student.birthDate,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(reorderedData),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    // Limited information GET student by id method
    if (studentId && request.httpMethod === 'GET') {
        const { data, error } = await supabase.from('students').select('*').eq('id', studentId);

        if (error) return { statusCode: 404, body: JSON.stringify({ error: 'Student not found' }) };

        // Reorder fields in the response
        const reorderedData = data.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            role: student.role,
            dateJoined: student.dateJoined,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(reorderedData),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Full information GET method
    if (request.httpMethod === 'GET' && request.headers['api-key'] === process.env.VITE_API_KEY) {
        const { data, error } = await supabase.from('students').select('*');

        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

        // Reorder fields in the response
        const reorderedData = data.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            middleInitial: student.middleInitial,
            lastName: student.lastName,
            age: student.age,
            role: student.role,
            dateJoined: student.dateJoined,
            birthDate: student.birthDate,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(reorderedData),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    // Limited information GET method
    if (request.httpMethod === 'GET') {
        const { data, error } = await supabase.from('students').select('*');

        if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

        // Reorder fields in the response
        const reorderedData = data.map((student) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            role: student.role,
            dateJoined: student.dateJoined,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(reorderedData),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Add student
    if (request.httpMethod === 'POST' && request.headers['api-key'] === process.env.VITE_API_KEY) {
        const body = JSON.parse(request.body);
        const { data, error } = await supabase.from('students').insert([body]);

        if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };

        return { statusCode: 201, body: JSON.stringify({ statusText: 'Student added successfully' }) };
    }
    if (request.httpMethod === 'POST' && request.headers['api-key'] !== process.env.VITE_API_KEY) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Update student
    if (studentId && request.httpMethod === 'PUT' && request.headers['api-key'] === process.env.VITE_API_KEY) {
        const body = JSON.parse(request.body);
        // Check if the body is complete
        if (!body.firstName || !body.lastName || !body.age || !body.role || !body.dateJoined || !body.birthDate) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const { data, error } = await supabase.from('students').update(body).eq('id', studentId);

        console.log(error);
        if (error) return { statusCode: 404, body: JSON.stringify({ statusText: 'Student not found' }) };

        return {
            statusCode: 201,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    if (studentId && request.httpMethod === 'PUT' && request.headers['api-key'] !== process.env.VITE_API_KEY) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // Delete student
    if (studentId && request.httpMethod === 'DELETE' && request.headers['api-key'] === process.env.VITE_API_KEY) {
        const { data, error } = await supabase.from('students').delete().eq('id', studentId);

        if (error) return { statusCode: 404, body: JSON.stringify({ error: error.message }) };
        return {
            statusCode: 204,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    if (studentId && request.httpMethod === 'DELETE' && request.headers['api-key'] !== process.env.VITE_API_KEY) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
