function isString(string) {
  return typeof string === "string" && string.trim().length > 0;
}

function mapExisting(object, properties) {
  const returnVal = {};
  if (properties) {
    for (const property of properties) {
      if (object[property]) {
        returnVal[property] = object[property];
      }
    }
  } else {
    for (const key in object) {
      if (object[key]) {
        returnVal[key] = object[key];
      }
    }
  }
  return returnVal;
}

module.exports = {
  isString,
  mapExisting
};
