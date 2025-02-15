import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

export const handler = async (request) => {
    if (request.httpMethod === 'GET') {
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

    if (request.httpMethod == 'POST' && request.headers['api-key'] == process.env.VITE_API_KEY) {
        const body = JSON.parse(request.body);
        const { data, error } = await supabase.from('students').insert([body]);

        if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };

        return { statusCode: 201, body: JSON.stringify(data) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
