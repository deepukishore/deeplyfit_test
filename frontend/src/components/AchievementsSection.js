import React from 'react';

const AchievementsSection = ({ achievements = [], dashboard = false }) => {
  if (!achievements.length) return null;

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <section className={`settings-section achievements-section animate-slide-up ${dashboard ? 'dashboard-achievements' : ''}`}>
      <div className="section-header achievements-section-header">
        <div>
          <span className="section-kicker">Milestones</span>
          <h2 className="section-title">Achievements</h2>
        </div>
        <span className="badge badge-lime">{unlockedCount} unlocked</span>
      </div>
      <div className="achievement-grid achievements-section-grid">
        {achievements.map((achievement) => {
          const current = Number(achievement.progress?.current || 0);
          const target = Math.max(Number(achievement.progress?.target || 1), 1);
          const progressPercent = Math.min((current / target) * 100, 100);

          return (
            <article key={achievement.key} className={`achievement-card ${achievement.unlocked ? 'unlocked' : ''}`}>
              <div className="achievement-card-head">
                <span className="achievement-icon" aria-hidden="true">{achievement.icon}</span>
                <span className={`badge ${achievement.unlocked ? 'badge-lime' : 'badge-amber'}`}>
                  {achievement.unlocked ? 'Unlocked' : `${current}/${target}`}
                </span>
              </div>
              <h3>{achievement.name}</h3>
              <p>{achievement.description}</p>
              <div
                className="progress-bar achievement-progress"
                role="progressbar"
                aria-label={`${achievement.name} progress`}
                aria-valuemin="0"
                aria-valuemax={target}
                aria-valuenow={Math.min(current, target)}
              >
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AchievementsSection;
