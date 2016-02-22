'use strict'

const fs = require('fs')
const nodemailer = require('nodemailer')
const schedule = require('node-schedule')
const request = require('superagent')

const getData = (amtId, postnrArr) => {
  return {
    'amtId': amtId,
    'huslejeMin': '0',
    'huslejeMax': '13000',
    'stoerrelseMin': '50',
    'stoerrelseMax': '0',
    'postnrArr': postnrArr,
    'boligTypeArr': ['0'],
    'lejeLaengdeArr': ['2', '6', '3'],
    'page': '1',
    'limit': '50',
    'sortCol': '3',
    'sortDesc': '1',
    'visOnSiteBolig': 0,
    'almen': -1,
    'billeder': -1,
    'husdyr': -1,
    'mobleret': -1,
    'delevenlig': -1,
    'fritekst': '',
    'overtagdato': '',
    'emailservice': '',
    'kunNyeste': false,
    'muListeMuId':'',
    'fremleje': -1,
    'roomsNum': '0'
  }
}

const post = (amtId, postnrArr) => {
  request
    .post('http://www.boligportal.dk/api/soeg_leje_bolig.php')
    .field('serviceName', 'getProperties')
    .field('data', JSON.stringify(getData(amtId, postnrArr)))
    .set('Accept', 'application/json')
    .end((err, res) => {
      if (err || !res.ok) {
        console.error(err)
      }
      else {
        persist(JSON.parse(res.text).properties)
      }
    })
}

const propertyPath = (property) => {
  return __dirname + '/properties/' + property.jqt_adId + '.json'
}

const persist = (properties) => {
  if (!properties) {
    return console.warn('nothing to persist')
  }
  const new_properties = properties.filter(property => {
    try {
      return !fs.statSync(propertyPath(property))
    }
    catch (err) {
      return err.code === 'ENOENT'
    }
  })

  new_properties.map(property => {
    fs.writeFileSync(propertyPath(property), JSON.stringify(property, null, 2))
  })

  notify(new_properties)
}

const notify = (properties) => {
  if (properties.length === 0) {
    return console.info(Date() + ': no new properties')
  }
  console.log(Date() + ': ' + properties.length + ' new properties')

  const transporter = nodemailer
    .createTransport('smtps://user%40gmail.com:,password@smtp.gmail.com')

  const mailOptions = {
    from: 'Bolig Portal <user@gmail.com>',
    to: 'address@gmail.com',
    subject: 'NU BOLIG: ' + Date(),
    text: properties.map(property => 'http://www.boligportal.dk' + property.jqt_adUrl).join(', \n'),
    html: properties.map(property => 'http://www.boligportal.dk' + property.jqt_adUrl).join(', <br>')
  }

  transporter.sendMail(mailOptions, function(error, info){
    if(error){
      return console.error(error)
    }
    console.info('Message sent: ' + info.response)
  })
}

const job = schedule.scheduleJob('* * * * *', () => {
  const settings = JSON.parse(fs.readFileSync('settings.json'))
  settings.params.map(param => {
    console.log(param)
    post(param.amtId, param.postnrArr)
  })
})