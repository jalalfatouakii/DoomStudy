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
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: configuration)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        // Static timeline for now
        let entry = SimpleEntry(date: Date(), configuration: configuration)
        return Timeline(entries: [entry], policy: .never)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
}

// MARK: - Views

struct SmallWidgetView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color.doomTint)
                    .font(.caption)
                Spacer()
            }
            
            Spacer()
            
            Text("12")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(Color.doomText)
            
            Text("Day Streak")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(Color.doomText.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
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
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(Color.doomText)
                .lineLimit(3)
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
                    Text("12 Days")
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
                    Text("12h 30m")
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

struct widgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView()
            case .systemMedium:
                MediumWidgetView()
            case .systemLarge:
                LargeWidgetView()
            default:
                SmallWidgetView()
            }
        }
        .padding()
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
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
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
    SimpleEntry(date: .now, configuration: .smiley)
}

#Preview(as: .systemMedium) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
}

#Preview(as: .systemLarge) {
    widget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley)
}
