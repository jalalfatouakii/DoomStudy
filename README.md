<img src="./assets/images/image.png" alt="DoomStudy Logo" width="100" height="100" style="display: block; margin: 0 auto;">

<br>
<div style="text-align: center;">
    <h1>DoomStudy</h1>
</div>

Transform your study materials into an engaging, scrollable learning experience. DoomStudy helps you learn through bite-sized content snippets generated from your course materials.

<div style="display: flex; gap: 10px; justify-content: center;">
    <a href="https://apps.apple.com/us/app/doomstudy/id6755923722" class="badge-custom">
        <img src="https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS">
    </a>
    <a href="https://play.google.com/store/apps/details?id=com.doomstudy.jxlxl" class="badge-custom">
        <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android">
    </a>
</div>

## Features

### Document Upload
- Upload PDFs (PPTX and DOCX support to come soon)
- Automatic text extraction and processing
- Organize content by courses with custom tags

### AI-Powered Learning
- Generate study snippets using AI (Gemini or offline models)
- Multiple snippet types: Facts, Concepts, Q&A, and True/False
- Customizable snippet generation settings

### Doomscroll Feed
- Learn through an endless, engaging feed interface
- Filter content by tags or specific courses
- Personalized "For You" recommendations
- Smooth, native scrolling experience

### Progress Tracking
- Monitor your learning journey
- Track statistics and progress
- View detailed course information

### Modern Design
- Beautiful, clean interface
- Native iOS and Android experience
- iOS widgets for quick access

### Customization
- Configure AI model preferences
- Adjust snippet generation parameters
- Personalize your learning experience

## Technologies

- **Framework**: React Native with Expo
- **AI**: Google Gemini API & On-device ML models (Apple Intelligence supported)
- **Platforms**: iOS, Android

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/jalalfatouakii/DoomStudy.git
   cd DoomStudy
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Prebuild the app
   ```bash
   npx expo prebuild
   ```

4. Run the app
   ```bash
   npx run:{ios|android}
   ```

## Project Structure

```
doomstudy/
├── app/              # App screens and routing
├── components/       # Reusable components
├── context/          # React context providers
├── utils/            # Utility functions
├── constants/        # App constants
└── assets/           # Images and static assets
```

## License

This project is open source and available under the [MIT License](LICENSE).
