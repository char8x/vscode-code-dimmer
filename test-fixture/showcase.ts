type Status = 'success' | 'failure' | 'pending';
const currentStatus: Status = 'success';

interface User {
  readonly id: number;
  name: string;
  email?: string;
  [key: string]: any;
}

interface ResponseData<T> {
  data: T;
  status: number;
  message: string;
}

abstract class BaseEntity {
  protected createdAt: Date = new Date();
  abstract getIdentifier(): string | number;
}

class Account extends BaseEntity {
  private _balance: number = 0;

  constructor(public owner: string) {
    super();
  }

  getIdentifier(): string {
    return `ACC-${this.owner.toUpperCase()}`;
  }

  get balance(): number {
    return this._balance;
  }

  public deposit(amount: number): void {
    if (amount > 0) this._balance += amount;
  }
}

type CustomPartial<T> = { [P in keyof T]?: T[P] };
type UserPreview = Pick<User, 'id' | 'name'>;
type IsString<T> = T extends string ? true : false;

function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(args);
    return original.apply(this, args);
  };
}

function processInput(input: string): string[];
function processInput(input: number): number;
function processInput(input: any): any {
  if (typeof input === 'string') return input.split('');
  return input;
}

async function fetchData<T>(url: string): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 1, name: 'Gemini', role: 'AI' } as unknown as T);
    }, 100);
  });
}

function isAdmin(user: User): user is User & { role: 'admin' } {
  return user.role === 'admin';
}

async function runDemonstration() {
  const myAcc = new Account('Alice', 1234);
  myAcc.deposit(500);

  const rawData = await fetchData<User>('https://api.example.com/user');

  if (isAdmin(rawData)) {
    console.log(rawData.name);
  }
}

runDemonstration().catch(console.error);

declare var GLOBAL_VERSION: string;
