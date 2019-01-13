$('#signup').submit((e) => {
    console.log(e.target.name.value)
    var data = {}
    data.username = e.target.name.value
    data.password = e.target.password.value
    if (!isTrueString(data.username) || !isTrueString(data.password)) {
        alert('username and passowrd are required')
        return false
    }
    if (isTrueString(e.target.email.value)) {
        data.email = e.target.email.value
    }
    $.ajax({
        type: "POST",
        url: '/api/signup',
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

