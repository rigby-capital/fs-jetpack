/** Formats type names with indefinite articles (a/an) joined by "or" for error messages. */
const prettyPrintTypes = (types: string[]): string => {
  const addArticle = (string_: string): string => {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (vowels.includes(string_[0])) {
      return `an ${string_}`;
    }

    return `a ${string_}`;
  };

  return types.map(addArticle).join(' or ');
};

/** Checks if a type definition string uses the "array of X" notation. */
const isArrayOfNotation = (typeDefinition: string): boolean => typeDefinition.includes('array of ');

/** Extracts the element type from an "array of X" notation string. */
const extractTypeFromArrayOfNotation = (typeDefinition: string): string => 
  // The notation is e.g. 'array of string'
  typeDefinition.split(' of ')[1]
;

const validTypes = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'buffer',
  'null',
  'undefined',
  'function',
] as const;

/** Validates that a type string is a recognized type, including "array of X" notation. */
const isValidTypeDefinition = (typeString: string): boolean => {
  if (isArrayOfNotation(typeString)) {
    return isValidTypeDefinition(extractTypeFromArrayOfNotation(typeString));
  }

  return (validTypes as readonly string[]).includes(typeString);
};

/** Returns the runtime type name of a value (e.g. "string", "array", "buffer", "null"). */
const detectType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (Buffer.isBuffer(value)) {
    return 'buffer';
  }

  return typeof value;
};

/** Array filter callback that retains only the first occurrence of each value. */
const onlyUniqueValuesInArrayFilter = (
  value: string,
  index: number,
  self: string[],
): boolean => self.indexOf(value) === index;

/** Like {@link detectType} but for arrays also includes element types (e.g. "array of string, number"). */
const detectTypeDeep = (value: unknown): string => {
  let type = detectType(value);

  if (type === 'array') {
    const typesInArray = (value as unknown[])
      .map((element) => detectType(element))
      .filter(onlyUniqueValuesInArrayFilter);
    type += ` of ${typesInArray.join(', ')}`;
  }

  return type;
};

/** Validates that all elements in an array match the expected element type from "array of X" notation. */
const validateArray = (
  argumentValue: unknown,
  typeToCheck: string,
): boolean => {
  const allowedTypeInArray = extractTypeFromArrayOfNotation(typeToCheck);

  if (detectType(argumentValue) !== 'array') {
    return false;
  }

  return (argumentValue as unknown[]).every((element) => detectType(element) === allowedTypeInArray);
};

/**
 * Validates that a single argument matches one of the expected types.
 * @throws If the argument type does not match any of the allowed types.
 */
const validateArgument = (
  methodName: string,
  argumentName: string,
  argumentValue: unknown,
  argumentMustBe: string[],
): void => {
  const isOneOfAllowedTypes = argumentMustBe.some((type) => {
    if (!isValidTypeDefinition(type)) {
      throw new Error(`Unknown type "${type}"`);
    }

    if (isArrayOfNotation(type)) {
      return validateArray(argumentValue, type);
    }

    return type === detectType(argumentValue);
  });

  if (!isOneOfAllowedTypes) {
    throw new Error(
      `Argument "${argumentName}" passed to ${methodName} must be ${prettyPrintTypes(
        argumentMustBe,
      )}. Received ${detectTypeDeep(argumentValue)}`,
    );
  }
};

/**
 * Validates an options object: checks it is an object, rejects unknown keys,
 * and validates each property value against its allowed types.
 * @throws If the object contains unknown keys or values of wrong types.
 */
const validateOptions = (
  methodName: string,
  optionsObjectName: string,
  object: Record<string, unknown> | undefined,
  allowedOptions: Record<string, string[]>,
): void => {
  if (object !== undefined) {
    validateArgument(methodName, optionsObjectName, object, ['object']);
    const record = object;
    for (const key of Object.keys(record)) {
      const argName = `${optionsObjectName}.${key}`;
      if (allowedOptions[key] === undefined) {
        throw new Error(
          `Unknown argument "${argName}" passed to ${methodName}`,
        );
      } else {
        validateArgument(methodName, argName, record[key], allowedOptions[key]);
      }
    }
  }
};

export const argument = validateArgument;
export const options = validateOptions;
