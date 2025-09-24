# Contributing to Universal Web3 Wallet

🎉 Thank you for considering contributing to Universal Web3 Wallet! We welcome contributions from the community and appreciate your help in making this project better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Git**
- **Chrome/Chromium** browser for testing

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/UniversalWeb3Wallet.git
   cd UniversalWeb3Wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development mode**
   ```bash
   npm run dev
   ```

4. **Load extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked extension"
   - Select the `dist` folder

## How to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Screenshots** if applicable
- **Environment details** (Chrome version, OS, etc.)

### 💡 Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- **Clear description** of the enhancement
- **Use case** explaining why this would be useful
- **Detailed implementation** ideas if you have them

### 🔧 Code Contributions

1. **Find an issue** to work on or create a new one
2. **Comment** on the issue to let others know you're working on it
3. **Fork** the repository
4. **Create a branch** for your feature or fix
5. **Make your changes**
6. **Test** your changes thoroughly
7. **Submit a pull request**

## Pull Request Process

### Before Submitting

- [ ] Your code follows the project's coding standards
- [ ] You've tested the extension manually
- [ ] You've updated documentation if needed
- [ ] Your commits have clear, descriptive messages
- [ ] You've signed your commits (optional but recommended)

### PR Checklist

- [ ] **Title**: Use a clear, descriptive title
- [ ] **Description**: Explain what changes you made and why
- [ ] **Issue**: Link to the related issue(s)
- [ ] **Testing**: Describe how you tested your changes
- [ ] **Screenshots**: Include screenshots for UI changes

### Review Process

1. **Automated checks** will run on your PR
2. **Maintainers** will review your code
3. **Feedback** may be provided for improvements
4. Once approved, your PR will be merged

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **meaningful variable names**
- Add **JSDoc comments** for complex functions
- Prefer **functional components** for React

### Code Style

```typescript
// Good
interface TokenData {
  address: string;
  symbol: string;
  decimals: number;
}

const handleAddToken = async (tokenData: TokenData): Promise<boolean> => {
  try {
    // Implementation
    return true;
  } catch (error) {
    console.error('Error adding token:', error);
    return false;
  }
};

// Bad
const handleAddToken = (tokenData: any) => {
  // Implementation without error handling
};
```

### React Components

- Use **functional components** with hooks
- Implement **proper error boundaries**
- Use **TypeScript interfaces** for props
- Follow **Ant Design** patterns for UI consistency

### File Organization

```
src/
├── components/         # Reusable components
├── pages/             # Page components
├── hooks/             # Custom hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── constants/         # App constants
```

## Testing

### Manual Testing

1. **Build the extension**
   ```bash
   npm run build
   ```

2. **Load in Chrome** and test:
   - Wallet creation/import
   - Account switching
   - Network switching
   - Token management
   - Transaction signing
   - DApp connections

### Test Cases

When contributing, please test:

- **Happy path** scenarios
- **Error handling**
- **Edge cases**
- **Different networks**
- **Multiple accounts**

## Security

### Security Guidelines

- **Never commit** private keys, mnemonics, or API keys
- **Use secure coding practices**
- **Validate all inputs**
- **Handle errors gracefully**
- **Follow principle of least privilege**

### Reporting Security Issues

Please DO NOT create public issues for security vulnerabilities. Instead:

1. Email security concerns to [SECURITY_EMAIL]
2. See our [Security Policy](SECURITY.md) for details
3. Allow reasonable time for response before disclosure

## Development Tips

### Project Structure

```typescript
// Example component structure
import React, { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import { useI18n } from '../hooks/useI18n';

interface MyComponentProps {
  onAction: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ onAction }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Component logic here

  return (
    <Button onClick={onAction} loading={loading}>
      {t('button.action')}
    </Button>
  );
};

export default MyComponent;
```

### Internationalization

- Use the `useI18n` hook for translations
- Add new keys to all language files
- Keep translations consistent across languages

### Browser Extension APIs

- Use `webextension-polyfill` for cross-browser compatibility
- Handle async operations properly
- Follow Chrome extension security guidelines

## Getting Help

Need help? Here are some resources:

- 📖 [Project Documentation](./docs/)
- 💬 [GitHub Discussions](https://github.com/yourusername/UniversalWeb3Wallet/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/UniversalWeb3Wallet/issues)
- 📧 [Contact Maintainers](mailto:maintainers@example.com)

## Recognition

Contributors will be:

- **Listed** in our README
- **Credited** in release notes
- **Invited** to join our contributor community

Thank you for contributing to Universal Web3 Wallet! 🚀