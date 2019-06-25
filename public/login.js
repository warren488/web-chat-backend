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
            var username = xhr.username
            setCookie('username' , username, 1000000)
            setCookie('token' , token, 1000000)
            window.location.href = '/home'
        },
        error: function (data) {
            if(data.responseJSON.message){
                alert(data.responseJSON.message)
            }else {
                alert('error login in')
            }
        },
        json: true
    });
    return false

})
