import WidgetKit
import SwiftUI

// MARK: - Colors
extension Color {
    static let doomBackground = Color(red: 0x15 / 255.0, green: 0x17 / 255.0, blue: 0x18 / 255.0)
    static let doomTint = Color(red: 0x80 / 255.0, green: 0xF6 / 255.0, blue: 0x5C / 255.0)
    static let doomText = Color(red: 0xEC / 255.0, green: 0xED / 255.0, blue: 0xEE / 255.0)
    static let doomSecondary = Color(red: 0x1A / 255.0, green: 0x1C / 255.0, blue: 0x1E / 255.0)
}

// MARK: - Provider
struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent(), streak: 12, timeSaved: 45000)
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        let (streak, timeSaved) = fetchStats()
        return SimpleEntry(date: Date(), configuration: configuration, streak: streak, timeSaved: timeSaved)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        let (streak, timeSaved) = fetchStats()
        let entry = SimpleEntry(date: Date(), configuration: configuration, streak: streak, timeSaved: timeSaved)
        return Timeline(entries: [entry], policy: .atEnd)
    }
    
    func fetchStats() -> (Int, Double) {
        let userDefaults = UserDefaults(suiteName: "group.com.doomstudy.jxlxl")
        let streak = userDefaults?.integer(forKey: "streak") ?? 0
        let timeSaved = userDefaults?.double(forKey: "timeSaved") ?? 0
        return (streak, timeSaved)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let streak: Int
    let timeSaved: Double
}

// MARK: - Views

struct SmallWidgetView: View {
    var entry: Provider.Entry
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 24))
                .foregroundStyle(Color.doomTint)
                .padding(.bottom, 4)
            
            Text("\(entry.streak)")
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundStyle(Color.doomText)
                .minimumScaleFactor(0.5)
            
            Text("Day Streak")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.doomText.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MediumWidgetView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("COURSE FACT")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.doomTint)
                    .tracking(1)
                Spacer()
                Image(systemName: "quote.opening")
                    .foregroundStyle(Color.doomTint.opacity(0.5))
            }
            
            Text("Files = FIFO, Piles = LIFO")
                .font(.body)
                .fontWeight(.medium)
                .foregroundStyle(Color.doomText)
                .lineLimit(4)
                .multilineTextAlignment(.leading)
            
            Spacer()
            
            Text("IFT 2015")
                .font(.caption)
                .foregroundStyle(Color.doomText.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct LargeWidgetView: View {
    var entry: Provider.Entry
    
    var formattedTimeSaved: String {
        let hours = Int(entry.timeSaved / 3600)
        let minutes = Int((entry.timeSaved.truncatingRemainder(dividingBy: 3600)) / 60)
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Top Section: Stats
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "flame.fill")
                            .foregroundStyle(Color.doomTint)
                            .font(.caption)
                        Text("STREAK")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.doomText.opacity(0.6))
                    }
                    Text("\(entry.streak) Days")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.doomText)
                }
                
                Divider()
                    .overlay(Color.doomText.opacity(0.2))
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundStyle(Color.doomTint)
                            .font(.caption)
                        Text("SAVED FROM DOOMSCROLLING")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.doomText.opacity(0.6))
                    }
                    Text(formattedTimeSaved)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.doomText)
                }
            }
            .padding(.bottom, 8)
            
            Divider()
                .overlay(Color.doomText.opacity(0.2))
            
            // Bottom Section: Quote
            VStack(alignment: .leading, spacing: 8) {
                Text("COURSE FACT")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.doomTint)
                    .tracking(1)
                
                Text("Your time is limited, so don't waste it living someone else's life.")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.doomText)
                    .lineLimit(4)
                
                Spacer()
                
                Text("IFT 2015")
                    .font(.caption)
                    .foregroundStyle(Color.doomText.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct AccessoryCircularView: View {
    var entry: Provider.Entry
    
    var body: some View {
        Gauge(value: Double(entry.streak), in: 0...7) {
            Image(systemName: "book.fill")
                .font(.system(size: 12))
        } currentValueLabel: {
            Text("\(entry.streak)")
        }
        .gaugeStyle(.accessoryCircular)
    }
}

struct AccessoryRectangularView: View {
    var entry: Provider.Entry
    
    var formattedTimeSaved: String {
        let hours = Int(entry.timeSaved / 3600)
        let minutes = Int((entry.timeSaved.truncatingRemainder(dividingBy: 3600)) / 60)
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("SAVED")
                .font(.caption2)
                .bold()
            Text(formattedTimeSaved)
                .font(.headline)
                .bold()
            Text("Less Doomscrolling")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

struct widgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(entry: entry)
            case .systemMedium:
                MediumWidgetView()
            case .systemLarge:
                LargeWidgetView(entry: entry)
            case .accessoryCircular:
                AccessoryCircularView(entry: entry)
            case .accessoryRectangular:
                AccessoryRectangularView(entry: entry)
            default:
                SmallWidgetView(entry: entry)
            }
        }
        .padding(family == .accessoryCircular || family == .accessoryRectangular ? 0 : 16)
        .widgetBackground(Color.doomBackground)
    }
}

struct widget: Widget {
    let kind: String = "widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            widgetEntryView(entry: entry)
        }
        .configurationDisplayName("DoomStudy Widget")
        .description("Stay motivated and track your progress.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

extension View {
    func widgetBackground(_ backgroundView: some View) -> some View {
        if #available(iOS 17.0, *) {
            return containerBackground(for: .widget) {
                backgroundView
            }
        } else {
            return background(backgroundView)
        }
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 12, timeSaved: 45000)
}

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 12, timeSaved: 45000)
}

#Preview(as: .systemLarge) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 12, timeSaved: 45000)
}

#Preview(as: .accessoryCircular) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 12, timeSaved: 45000)
}

#Preview(as: .accessoryRectangular) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 12, timeSaved: 45000)
}
