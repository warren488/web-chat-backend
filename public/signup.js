$('#signup').submit((e) => {
    let feebackEl = document.querySelector('.feedback')
    feebackEl.innerHTML = '';
    feebackEl.classList.remove('alert')    
    var data = {}
    data.username = e.target.name.value
    data.password = e.target.password.value
    if (!isTrueString(data.username) || !isTrueString(data.password)) {
        feebackEl.innerHTML = 'username and passowrd are required';
        feebackEl.classList.add('alert')
        return false
    }
    if(data.password.length < 7){
        feebackEl.innerHTML = 'passowrd must be at least 7 characters';
        feebackEl.classList.add('alert')
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
        success: function(xhr) {
            var token = xhr.token
            document.cookie = 'token=' + token
            window.location.href = '/home'
        },
        error: function(data) {
            if (data.responseJSON.message) {
                feebackEl.innerHTML = data.responseJSON.message;
                feebackEl.classList.add('alert')
            } else {
                feebackEl.innerHTML = 'error signing up';
                feebackEl.classList.add('alert')
            }
        },
        json: true
    });
    return false
})