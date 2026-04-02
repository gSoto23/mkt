export async function apiFetch(url: string, options: RequestInit = {}) {
    let token = '';
    if (typeof window !== 'undefined') {
        token = localStorage.getItem('token') || '';
    }

    const headers = {
        ...options.headers as any,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    }

    return response;
}
