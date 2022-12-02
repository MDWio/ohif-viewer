// Got from Marketplace
export class PersonName {
  ALPHABETIC_REPRESENTATION = 0;
  COMPONENT_DELIMITER = '^';
  GROUP_DELIMITER = '=';
  LAST_NAME_COMPONENT = 0;
  FIRST_NAME_COMPONENT = 1;
  MIDDLE_NAME_COMPONENT = 2;
  NAME_PREFIX_COMPONENT = 3;
  NAME_SUFFIX_COMPONENT = 4;

  rawValue = '';

  constructor(rawValue) {
    this.setRawValue(rawValue);
  }

  setRawValue(rawValue) {
    this.rawValue = typeof rawValue === 'string' ? rawValue : '';
  }

  getRawValue() {
    return this.rawValue;
  }

  getLastName() {
    return this.getComponent(
      this.ALPHABETIC_REPRESENTATION,
      this.LAST_NAME_COMPONENT
    );
  }

  getFirstName() {
    return this.getComponent(
      this.ALPHABETIC_REPRESENTATION,
      this.FIRST_NAME_COMPONENT
    );
  }

  getMiddleName() {
    return this.getComponent(
      this.ALPHABETIC_REPRESENTATION,
      this.MIDDLE_NAME_COMPONENT
    );
  }

  getNamePrefix() {
    return this.getComponent(
      this.ALPHABETIC_REPRESENTATION,
      this.NAME_PREFIX_COMPONENT
    );
  }

  getNameSuffix() {
    return this.getComponent(
      this.ALPHABETIC_REPRESENTATION,
      this.NAME_SUFFIX_COMPONENT
    );
  }

  getData() {
    return {
      lastName: this.getLastName(),
      firstName: this.getFirstName(),
      middleName: this.getMiddleName(),
      prefixName: this.getNamePrefix(),
      suffixName: this.getNameSuffix(),
    };
  }

  getComponent(groupId, componentId) {
    const group = this.getGroup(groupId);
    if (!group) {
      return;
    }

    const components = group.split(this.COMPONENT_DELIMITER);

    return components[componentId];
  }

  getGroup(groupId) {
    const groups = this.rawValue.trim().split(this.GROUP_DELIMITER);

    return groups[groupId];
  }
}
