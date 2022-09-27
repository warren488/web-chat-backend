module.exports = {
    uniqueConst(err, field) {
        console.log(err.errors);
        // eventually this part will live in errorToResponse
        if (field && err?.errors?.[field]?.kind == 'unique') {
            return {
                found: true,
                message: `${field} already taken`,
            };
        } else {
            let errors = []
            for (const field in err?.errors) {
                if (err?.errors?.[field]?.kind == 'unique') {
                    errors.push(field)
                }
            }
            return errors
        }
    }
}