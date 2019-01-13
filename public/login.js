$("#login").submit(e => {
    var data = {}
    data.username = e.target.username.value
    data.password = e.target.password.value
    if (!isTrueString(data.username) || !isTrueString(data.password)) {
        alert('username and passowrd are required')
        return false
    }
    $.ajax({
        type: "POST",
        url: '/api/login',
        data: JSON.stringify(data),
        headers: {
            'Content-type': 'application/json'
        },
        success: function (xhr) {
            var token = xhr.token
            document.cookie = 'token=' + token
            window.location.href = '/home'
        },
        error: console.log,
        json: true
    });
    return false

})
