import { PersonName } from './PersonName';

// Got from Marketplace
export class PersonNameNormalizer {
  personName;

  constructor(personName) {
    this.personName = personName;
    this.personName.setRawValue(
      this.trimRawPersonNameValue(this.personName.getRawValue())
    );
  }

  normalize() {
    const nameComponents = this.clearNameComponents(this.getNameComponents());

    return new PersonName(nameComponents.join('^'));
  }

  clearNameComponents(nameParts) {
    const regex = /[^a-zA-Zа-яёА-ЯЁ0-9\.\-\_\s\']/g; // https://regex101.com/r/HMC6cY/1

    return nameParts
      .filter(part => typeof part === 'string')
      .map(part => part.replace(regex, '').trim());
  }

  getNameComponents() {
    const components = [];

    components.push(this.personName.getLastName());
    components.push(this.personName.getFirstName());
    components.push(this.personName.getMiddleName());
    components.push(this.personName.getNamePrefix());
    components.push(this.personName.getNameSuffix());

    return components;
  }

  trimRawPersonNameValue(rawValue) {
    let filteredValue = '';

    for (const char of rawValue) {
      if ([16].includes(char.charCodeAt(0))) {
        break;
      }
      filteredValue += char;
    }

    return filteredValue;
  }
}
