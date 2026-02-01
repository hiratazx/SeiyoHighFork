export const formatApiError = (errorMessage: string): string => {
    if (!errorMessage) return '';
    if (errorMessage === 'API_ERROR_TIMEOUT') return 'Request timed out (3.5 min)';
    
    try {
        const jsonStartIndex = errorMessage.indexOf('{');
        if (jsonStartIndex !== -1) {
            const jsonString = errorMessage.substring(jsonStartIndex);
            const parsedError = JSON.parse(jsonString);
            if (parsedError.error && parsedError.error.code && parsedError.error.status) {
                return `${parsedError.error.code} - ${parsedError.error.status}`;
            }
        }
    } catch (e) {
        // Failed to parse, fall back to original behavior
    }

    // Fallback truncation for long messages that aren't the expected JSON format
    if (errorMessage.length > 50) {
        return errorMessage.substring(0, 47) + '...';
    }
    return errorMessage;
};

