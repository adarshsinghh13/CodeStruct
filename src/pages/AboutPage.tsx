
import React from 'react';

const AboutPage = () => {
  return (
    <div className="container px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="dsa-heading mb-8 text-center">About Me</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="lead text-xl mb-8">
            👋 Hello! I'm Adarsh Singh, a passionate and driven Third-Year Computer Science Student, 
            on the cusp of launching my career as a Software Engineer.
          </p>
          
          <h2 className="text-2xl font-bold mb-4">💻 My Journey</h2>
          <p>
            With a strong foundation in C++, Data Structures & Algorithms (DSA), and Full-Stack Development, 
            I thrive on solving complex problems and building efficient, scalable solutions. My academic journey 
            has equipped me with hands-on experience in both frontend and backend technologies, and I'm constantly 
            exploring new frameworks and tools to stay ahead in the ever-evolving tech landscape.
          </p>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">🚀 What I Do</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Develop clean, optimized code with a focus on performance and usability.</li>
            <li>Build full-stack web applications using modern technologies.</li>
            <li>Solve algorithmic challenges to sharpen my problem-solving skills.</li>
            <li>Collaborate on projects that bridge theory and real-world impact.</li>
          </ul>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">🔍 Looking Ahead</h2>
          <p>
            I'm eager to contribute my skills to innovative tech projects, learn from industry experts, 
            and grow as a versatile developer. Whether it's internships, open-source contributions, 
            or networking with fellow tech enthusiasts—I'm always open to new opportunities!
          </p>
          
          <h2 className="text-2xl font-bold mb-4 mt-8">🌟 Let's Connect!</h2>
          <p>
            If you're as passionate about technology as I am, let's collaborate, share ideas, or just chat about the latest in tech!
          </p>
          
          <div className="mt-6 flex flex-col space-y-2">
            <p><strong>📩 Email:</strong> <a href="mailto:adarshsinghh13@gmail.com" className="text-dsa-purple hover:underline">adarshsinghh13@gmail.com</a></p>
            <p><strong>🔗 LinkedIn:</strong> <a href="https://www.linkedin.com/in/adarshsinghh13" target="_blank" rel="noopener noreferrer" className="text-dsa-purple hover:underline">adarshsinghh13</a></p>
            <p><strong>💾 GitHub:</strong> <a href="https://github.com/adarshsinghh13" target="_blank" rel="noopener noreferrer" className="text-dsa-purple hover:underline">adarshsinghh13</a></p>
          </div>
          
          <div className="bg-secondary/30 p-6 rounded-lg mt-10">
            <h3 className="text-xl font-semibold mb-4">About CodeStruct</h3>
            <p>
             CodeStruct is a project I developed to help fellow students and developers master data structures and algorithms. 
              This platform offers visualizations, practice problems, and interactive tools to make learning DSA concepts more engaging and intuitive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
