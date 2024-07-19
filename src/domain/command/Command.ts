interface Command {
  name: string;
  command?: string;

  execute(): void;
}
