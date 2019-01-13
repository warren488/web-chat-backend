function getToken(){
    let cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1")
    return (cookieValue !== '' ? cookieValue: null)
}


function isTrueString(string) {
    return (typeof string === 'string' && string.trim().length > 0)
}